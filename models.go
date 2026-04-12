package main

import (
	"errors"
	"strings"
	"time"
)

const (
	RoleAdmin    = "admin"
	RoleOperator = "operator"
	RoleViewer   = "viewer"
)

type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type Sensor struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Location  string    `json:"location"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type Reading struct {
	ID         int64     `json:"id"`
	SensorID   int64     `json:"sensor_id"`
	Value      float64   `json:"value"`
	Unit       string    `json:"unit"`
	RecordedAt time.Time `json:"recorded_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func ValidateRole(role string) error {
	r := strings.ToLower(strings.TrimSpace(role))
	switch r {
	case RoleAdmin, RoleOperator, RoleViewer:
		return nil
	default:
		return errors.New("invalid role")
	}
}

func NormalizeRole(role string) string {
	return strings.ToLower(strings.TrimSpace(role))
}

