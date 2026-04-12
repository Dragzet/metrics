package main

import (
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"

	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

func NewStore(dsn string) (*Store, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	if err := s.seed(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	schema := `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_id INTEGER NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);
`
	_, err := s.db.Exec(schema)
	return err
}

func (s *Store) seed() error {
	var usersCount int
	if err := s.db.QueryRow("SELECT COUNT(1) FROM users").Scan(&usersCount); err != nil {
		return err
	}
	if usersCount == 0 {
		seedUsers := []struct {
			username string
			password string
			role     string
		}{
			{"admin", "admin123", RoleAdmin},
			{"operator", "operator123", RoleOperator},
			{"viewer", "viewer123", RoleViewer},
		}
		for _, u := range seedUsers {
			hash, err := HashPassword(u.password)
			if err != nil {
				return err
			}
			if _, err := s.db.Exec(
				"INSERT INTO users(username, password_hash, role) VALUES (?, ?, ?)",
				u.username,
				hash,
				u.role,
			); err != nil {
				return err
			}
		}
	}

	var sensorsCount int
	if err := s.db.QueryRow("SELECT COUNT(1) FROM sensors").Scan(&sensorsCount); err != nil {
		return err
	}
	if err := s.ensureSeedSensors(); err != nil {
		return err
	}

	if err := s.ensureSeedReadings(); err != nil {
		return err
	}
	return nil
}

func (s *Store) ensureSeedSensors() error {
	for _, stmt := range []string{
		"INSERT INTO sensors(name, location, status) SELECT 'Датчик температуры #1', 'Цех A', 'active' WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Датчик температуры #1')",
		"INSERT INTO sensors(name, location, status) SELECT 'Датчик влажности #1', 'Склад B', 'active' WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Датчик влажности #1')",
		"INSERT INTO sensors(name, location, status) SELECT 'Датчик давления #1', 'Линия C', 'maintenance' WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Датчик давления #1')",
		"INSERT INTO sensors(name, location, status) SELECT 'Датчик CO2 #1', 'Офис 1', 'active' WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Датчик CO2 #1')",
		"INSERT INTO sensors(name, location, status) SELECT 'Датчик вибрации #1', 'Станок 7', 'inactive' WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Датчик вибрации #1')",
		"INSERT INTO sensors(name, location, status) SELECT 'Датчик напряжения #1', 'Щитовая', 'active' WHERE NOT EXISTS (SELECT 1 FROM sensors WHERE name = 'Датчик напряжения #1')",
	} {
		if _, err := s.db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ensureSeedReadings() error {
	now := time.Now().UTC()
	type seedSeries struct {
		sensorID int64
		unit     string
		base     float64
		step     float64
		amp      float64
		count    int
		minutes  int
	}

	series := []seedSeries{
		{sensorID: 1, unit: "C", base: 20.5, step: 0.18, amp: 0.9, count: 18, minutes: 6},
		{sensorID: 2, unit: "%", base: 41.0, step: 0.35, amp: 1.8, count: 16, minutes: 7},
		{sensorID: 3, unit: "kPa", base: 98.3, step: 0.08, amp: 0.25, count: 14, minutes: 8},
		{sensorID: 4, unit: "ppm", base: 610, step: 4.5, amp: 35, count: 20, minutes: 5},
		{sensorID: 5, unit: "g", base: 0.12, step: 0.01, amp: 0.05, count: 12, minutes: 10},
		{sensorID: 6, unit: "V", base: 220.1, step: -0.05, amp: 1.2, count: 18, minutes: 4},
	}

	for _, cfg := range series {
		var readingsCount int
		if err := s.db.QueryRow("SELECT COUNT(1) FROM readings WHERE sensor_id = ?", cfg.sensorID).Scan(&readingsCount); err != nil {
			return err
		}
		if readingsCount > 0 {
			continue
		}

		for i := 0; i < cfg.count; i++ {
			phase := float64(i) / 2.2
			value := cfg.base + cfg.step*float64(i) + math.Sin(phase)*cfg.amp
			recordedAt := now.Add(time.Duration(-(cfg.count-i)*cfg.minutes) * time.Minute)
			if cfg.sensorID == 5 {
				value = math.Abs(value)
			}
			if _, err := s.db.Exec(
				"INSERT INTO readings(sensor_id, value, unit, recorded_at) VALUES (?, ?, ?, ?)",
				cfg.sensorID,
				math.Round(value*10) / 10,
				cfg.unit,
				recordedAt,
			); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *Store) FindUserByUsername(username string) (User, string, error) {
	var user User
	var hash string
	err := s.db.QueryRow(
		"SELECT id, username, role, created_at, password_hash FROM users WHERE username = ?",
		username,
	).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedAt, &hash)
	if err != nil {
		return User{}, "", err
	}
	return user, hash, nil
}

func (s *Store) ListUsers() ([]User, error) {
	rows, err := s.db.Query("SELECT id, username, role, created_at FROM users ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := make([]User, 0)
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (s *Store) CreateUser(username, password, role string) (User, error) {
	if err := ValidateRole(role); err != nil {
		return User{}, err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return User{}, err
	}
	res, err := s.db.Exec(
		"INSERT INTO users(username, password_hash, role) VALUES (?, ?, ?)",
		username,
		hash,
		NormalizeRole(role),
	)
	if err != nil {
		return User{}, err
	}
	id, _ := res.LastInsertId()
	var u User
	err = s.db.QueryRow("SELECT id, username, role, created_at FROM users WHERE id = ?", id).
		Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt)
	return u, err
}

func (s *Store) UpdateUserRole(id int64, role string) error {
	if err := ValidateRole(role); err != nil {
		return err
	}
	res, err := s.db.Exec("UPDATE users SET role = ? WHERE id = ?", NormalizeRole(role), id)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) DeleteUser(id int64) error {
	res, err := s.db.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) ListSensors() ([]Sensor, error) {
	rows, err := s.db.Query("SELECT id, name, location, status, created_at FROM sensors ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Sensor, 0)
	for rows.Next() {
		var x Sensor
		if err := rows.Scan(&x.ID, &x.Name, &x.Location, &x.Status, &x.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, x)
	}
	return items, rows.Err()
}

func (s *Store) CreateSensor(name, location, status string) (Sensor, error) {
	res, err := s.db.Exec("INSERT INTO sensors(name, location, status) VALUES (?, ?, ?)", name, location, status)
	if err != nil {
		return Sensor{}, err
	}
	id, _ := res.LastInsertId()
	var x Sensor
	err = s.db.QueryRow("SELECT id, name, location, status, created_at FROM sensors WHERE id = ?", id).
		Scan(&x.ID, &x.Name, &x.Location, &x.Status, &x.CreatedAt)
	return x, err
}

func (s *Store) UpdateSensor(id int64, name, location, status string) error {
	res, err := s.db.Exec("UPDATE sensors SET name = ?, location = ?, status = ? WHERE id = ?", name, location, status, id)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) DeleteSensor(id int64) error {
	res, err := s.db.Exec("DELETE FROM sensors WHERE id = ?", id)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) ListReadings(sensorID int64, limit int) ([]Reading, error) {
	query := "SELECT id, sensor_id, value, unit, recorded_at, created_at FROM readings"
	args := make([]any, 0, 2)
	if sensorID > 0 {
		query += " WHERE sensor_id = ?"
		args = append(args, sensorID)
	}
	query += " ORDER BY recorded_at DESC"
	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Reading, 0)
	for rows.Next() {
		var x Reading
		if err := rows.Scan(&x.ID, &x.SensorID, &x.Value, &x.Unit, &x.RecordedAt, &x.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, x)
	}
	return items, rows.Err()
}

func (s *Store) CreateReading(sensorID int64, value float64, unit string, recordedAt time.Time) (Reading, error) {
	var exists int
	if err := s.db.QueryRow("SELECT COUNT(1) FROM sensors WHERE id = ?", sensorID).Scan(&exists); err != nil {
		return Reading{}, err
	}
	if exists == 0 {
		return Reading{}, errors.New("sensor not found")
	}
	res, err := s.db.Exec(
		"INSERT INTO readings(sensor_id, value, unit, recorded_at) VALUES (?, ?, ?, ?)",
		sensorID,
		value,
		unit,
		recordedAt,
	)
	if err != nil {
		return Reading{}, err
	}
	id, _ := res.LastInsertId()
	var x Reading
	err = s.db.QueryRow(
		"SELECT id, sensor_id, value, unit, recorded_at, created_at FROM readings WHERE id = ?",
		id,
	).Scan(&x.ID, &x.SensorID, &x.Value, &x.Unit, &x.RecordedAt, &x.CreatedAt)
	return x, err
}

func (s *Store) Ping() error {
	if err := s.db.Ping(); err != nil {
		return fmt.Errorf("db ping: %w", err)
	}
	return nil
}

