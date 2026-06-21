package main

import (
	"math"
	"strings"
	"testing"
	"time"
)

func FuzzValidateRole(f *testing.F) {
	for _, seed := range []string{"admin", "operator", "viewer", "", "root", "ADMIN"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, role string) {
		err := ValidateRole(role)
		n := NormalizeRole(role)
		if n == RoleAdmin || n == RoleOperator || n == RoleViewer {
			if err != nil {
				t.Fatalf("valid role rejected: %q", role)
			}
		}
	})
}

func FuzzParseIDFromPath(f *testing.F) {
	f.Add("/api/users/12", "/api/users/")
	f.Add("/api/users/abc", "/api/users/")
	f.Add("/api/users/1/2", "/api/users/")
	f.Fuzz(func(t *testing.T, path, prefix string) {
		_, _ = parseIDFromPath(path, prefix)
	})
}

func FuzzJWTBuildAndParse(f *testing.F) {
	secrets := []string{
		"my-secret",
		"",
		"a",
		"a very long secret that goes on and on and should still work for HMAC signing purposes even if it is quite long indeed",
		"1234567890",
	}
	for _, secret := range secrets {
		f.Add(secret, int64(1), "testuser", RoleViewer)
	}
	f.Fuzz(func(t *testing.T, secret string, userID int64, username, role string) {
		token, err := BuildJWT(secret, userID, username, role)
		if err != nil {
			return
		}

		claims, err := ParseJWT(secret, token)
		if err != nil {
			t.Fatalf("round-trip failed for valid token: %v", err)
		}
		if claims.UserID != userID {
			t.Fatalf("userID mismatch: got %d, want %d", claims.UserID, userID)
		}
	})
}

func FuzzParseJWTMalformed(f *testing.F) {
	seeds := []string{
		"",
		"not-a-jwt",
		"header.payload",
		"header.payload.signature",
		"a.b.c",
		"eyJhbGciOiJIUzI1NiJ9.dGVzdA.sig",
		"%%%.%%%.%%%",
	}
	for _, s := range seeds {
		f.Add("secret", s)
	}
	f.Fuzz(func(t *testing.T, secret, token string) {

		_, _ = ParseJWT(secret, token)
	})
}

func FuzzHashPassword(f *testing.F) {
	seeds := []string{
		"a",
		"ab",
		"abc",
		"password",
		"a very long password that is well beyond typical length " + strings.Repeat("x", 200),
		"привет",
		"パスワード",
		"\x00\x01\x02",
	}
	for _, s := range seeds {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, password string) {
		hash, err := HashPassword(password)
		if err != nil {
			return
		}

		if err := VerifyPassword(hash, password); err != nil {
			t.Fatalf("verify failed for valid hash: %v", err)
		}

		if err := VerifyPassword(hash, password+"wrong"); err == nil {
			t.Fatal("wrong password was accepted")
		}
	})
}

func FuzzHashPasswordInvalidHash(f *testing.F) {
	hashes := []string{
		"",
		"not-a-hash",
		"$2a$10$invalid",
		"$2a$10$abcdefghijklmnopqrstuu",
	}
	for _, h := range hashes {
		f.Add(h, "password")
	}
	f.Fuzz(func(t *testing.T, hash, password string) {

		_ = VerifyPassword(hash, password)
	})
}

func FuzzStoreCreateReading(f *testing.F) {
	values := []float64{
		0,
		-1,
		1.5,
		math.NaN(),
		math.Inf(1),
		math.Inf(-1),
		math.MaxFloat64,
		-math.MaxFloat64,
		math.SmallestNonzeroFloat64,
	}
	for _, v := range values {
		f.Add(int64(1), v, "C", "2024-01-15T10:00:00Z")
	}
	f.Fuzz(func(t *testing.T, sensorID int64, value float64, unit, recordedAtStr string) {
		recordedAt, err := time.Parse(time.RFC3339, recordedAtStr)
		if err != nil {
			return
		}

		if math.IsNaN(value) || math.IsInf(value, 0) {
			t.Logf("edge case value: sensorID=%d, value=%v, unit=%s, recordedAt=%v",
				sensorID, value, unit, recordedAt)
		}
	})
}
