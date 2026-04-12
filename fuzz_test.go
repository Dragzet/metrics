package main

import "testing"

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

