package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
)

const testSecret = "test-secret-123"

func makeToken(header, payload map[string]any, secret string) string {
	hb, _ := json.Marshal(header)
	pb, _ := json.Marshal(payload)
	h := base64.RawURLEncoding.EncodeToString(hb)
	p := base64.RawURLEncoding.EncodeToString(pb)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(h + "." + p))
	return h + "." + p + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func hs256(payload map[string]any, secret string) string {
	return makeToken(map[string]any{"alg": "HS256", "typ": "JWT"}, payload, secret)
}

func TestValidateToken_Valid(t *testing.T) {
	tok := hs256(map[string]any{"user_id": "u1", "role": "admin", "exp": time.Now().Add(time.Hour).Unix()}, testSecret)
	claims, err := ValidateToken(tok, testSecret)
	if err != nil || claims.UserID != "u1" || claims.Role != "admin" {
		t.Fatalf("valid token rejected: err=%v claims=%+v", err, claims)
	}
}

func TestValidateToken_Rejects(t *testing.T) {
	cases := map[string]string{
		"expired":        hs256(map[string]any{"user_id": "u1", "exp": time.Now().Add(-time.Hour).Unix()}, testSecret),
		"alg_none":       makeToken(map[string]any{"alg": "none", "typ": "JWT"}, map[string]any{"user_id": "u1"}, testSecret),
		"missing_userid": hs256(map[string]any{"role": "admin"}, testSecret),
		"malformed":      "not.a.jwt.token",
	}
	for name, tok := range cases {
		if _, err := ValidateToken(tok, testSecret); err == nil {
			t.Errorf("%s: expected error, got nil", name)
		}
	}
	// signature salah: token valid tapi diverifikasi dengan secret yang keliru.
	good := hs256(map[string]any{"user_id": "u1", "exp": time.Now().Add(time.Hour).Unix()}, testSecret)
	if _, err := ValidateToken(good, "wrong-secret"); err == nil {
		t.Error("bad signature: expected error, got nil")
	}
	// secret kosong harus selalu gagal.
	if _, err := ValidateToken(good, ""); err == nil {
		t.Error("empty secret: expected error, got nil")
	}
}
