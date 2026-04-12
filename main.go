package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

//go:embed web/*
var webFS embed.FS

type Server struct {
	store     *Store
	jwtSecret string
}

func main() {
	addr := envOrDefault("APP_ADDR", ":8080")
	dbPath := envOrDefault("DB_PATH", "file:metrics.db?_pragma=foreign_keys(1)")
	secret := envOrDefault("JWT_SECRET", "dev-secret-change-me")

	store, err := NewStore(dbPath)
	if err != nil {
		log.Fatalf("init store: %v", err)
	}
	defer store.Close()

	srv := &Server{store: store, jwtSecret: secret}
	mux := http.NewServeMux()
	srv.registerRoutes(mux)

	log.Printf("server started on %s", addr)
	if err := http.ListenAndServe(addr, logRequest(mux)); err != nil {
		log.Fatalf("listen: %v", err)
	}
}

func (s *Server) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/", s.handleIndex)
	mux.Handle("/web/", http.StripPrefix("/web/", http.FileServer(http.FS(webFS))))
	mux.HandleFunc("/healthz", s.handleHealth)

	mux.HandleFunc("/api/login", s.handleLogin)
	mux.HandleFunc("/api/me", s.withAuth(s.handleMe))

	mux.HandleFunc("/api/users", s.withAuth(s.handleUsers))
	mux.HandleFunc("/api/users/", s.withAuth(s.handleUserByID))

	mux.HandleFunc("/api/sensors", s.withAuth(s.handleSensors))
	mux.HandleFunc("/api/sensors/", s.withAuth(s.handleSensorByID))

	mux.HandleFunc("/api/readings", s.withAuth(s.handleReadings))
}

func (s *Server) withAuth(next func(http.ResponseWriter, *http.Request, *Claims)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, "missing authorization", http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			http.Error(w, "invalid authorization header", http.StatusUnauthorized)
			return
		}
		claims, err := ParseJWT(s.jwtSecret, parts[1])
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		next(w, r, claims)
	}
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	data, err := webFS.ReadFile("web/index.html")
	if err != nil {
		http.Error(w, "unable to render index", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	if err := s.store.Ping(); err != nil {
		http.Error(w, "db unavailable", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	user, hash, err := s.store.FindUserByUsername(strings.TrimSpace(req.Username))
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if err := VerifyPassword(hash, req.Password); err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	token, err := BuildJWT(s.jwtSecret, user.ID, user.Username, user.Role)
	if err != nil {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request, claims *Claims) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":       claims.UserID,
		"username": claims.Username,
		"role":     claims.Role,
	})
}

func (s *Server) handleUsers(w http.ResponseWriter, r *http.Request, claims *Claims) {
	if claims.Role != RoleAdmin {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	switch r.Method {
	case http.MethodGet:
		users, err := s.store.ListUsers()
		if err != nil {
			http.Error(w, "cannot list users", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, users)
	case http.MethodPost:
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.Username == "" || len(req.Password) < 6 {
			http.Error(w, "username/password invalid", http.StatusBadRequest)
			return
		}
		if err := ValidateRole(req.Role); err != nil {
			http.Error(w, "invalid role", http.StatusBadRequest)
			return
		}
		created, err := s.store.CreateUser(req.Username, req.Password, req.Role)
		if err != nil {
			http.Error(w, "cannot create user", http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleUserByID(w http.ResponseWriter, r *http.Request, claims *Claims) {
	if claims.Role != RoleAdmin {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/users/")
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPut:
		var req struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if err := s.store.UpdateUserRole(id, req.Role); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "user not found", http.StatusNotFound)
				return
			}
			http.Error(w, "cannot update user", http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	case http.MethodDelete:
		if id == claims.UserID {
			http.Error(w, "self delete forbidden", http.StatusBadRequest)
			return
		}
		if err := s.store.DeleteUser(id); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "user not found", http.StatusNotFound)
				return
			}
			http.Error(w, "cannot delete user", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleSensors(w http.ResponseWriter, r *http.Request, claims *Claims) {
	switch r.Method {
	case http.MethodGet:
		items, err := s.store.ListSensors()
		if err != nil {
			http.Error(w, "cannot list sensors", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, items)
	case http.MethodPost:
		if claims.Role != RoleAdmin && claims.Role != RoleOperator {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var req struct {
			Name     string `json:"name"`
			Location string `json:"location"`
			Status   string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.Name == "" || req.Location == "" || req.Status == "" {
			http.Error(w, "empty fields", http.StatusBadRequest)
			return
		}
		created, err := s.store.CreateSensor(req.Name, req.Location, req.Status)
		if err != nil {
			http.Error(w, "cannot create sensor", http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleSensorByID(w http.ResponseWriter, r *http.Request, claims *Claims) {
	id, err := parseIDFromPath(r.URL.Path, "/api/sensors/")
	if err != nil {
		http.Error(w, "invalid sensor id", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPut:
		if claims.Role != RoleAdmin && claims.Role != RoleOperator {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var req struct {
			Name     string `json:"name"`
			Location string `json:"location"`
			Status   string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if err := s.store.UpdateSensor(id, req.Name, req.Location, req.Status); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "sensor not found", http.StatusNotFound)
				return
			}
			http.Error(w, "cannot update sensor", http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	case http.MethodDelete:
		if claims.Role != RoleAdmin {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if err := s.store.DeleteSensor(id); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "sensor not found", http.StatusNotFound)
				return
			}
			http.Error(w, "cannot delete sensor", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleReadings(w http.ResponseWriter, r *http.Request, claims *Claims) {
	switch r.Method {
	case http.MethodGet:
		sensorID, _ := strconv.ParseInt(r.URL.Query().Get("sensor_id"), 10, 64)
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		items, err := s.store.ListReadings(sensorID, limit)
		if err != nil {
			http.Error(w, "cannot list readings", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, items)
	case http.MethodPost:
		if claims.Role != RoleAdmin && claims.Role != RoleOperator {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var req struct {
			SensorID   int64   `json:"sensor_id"`
			Value      float64 `json:"value"`
			Unit       string  `json:"unit"`
			RecordedAt string  `json:"recorded_at"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		recordedAt, err := time.Parse(time.RFC3339, req.RecordedAt)
		if err != nil {
			http.Error(w, "invalid recorded_at", http.StatusBadRequest)
			return
		}
		created, err := s.store.CreateReading(req.SensorID, req.Value, req.Unit, recordedAt)
		if err != nil {
			http.Error(w, "cannot create reading", http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func parseIDFromPath(path, prefix string) (int64, error) {
	idStr := strings.TrimSpace(strings.TrimPrefix(path, prefix))
	if idStr == "" || strings.Contains(idStr, "/") {
		return 0, errors.New("invalid id")
	}
	return strconv.ParseInt(idStr, 10, 64)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func logRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); strings.TrimSpace(v) != "" {
		return v
	}
	return fallback
}
