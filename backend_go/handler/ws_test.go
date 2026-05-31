package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
)

func TestValidChannel(t *testing.T) {
	valid := []string{"orders", "orders.99", "private-orders.1", "presence-room", "orders.*", "chat.room-1"}
	for _, c := range valid {
		if !validChannel(c) {
			t.Errorf("seharusnya valid: %q", c)
		}
	}
	invalid := []string{"", "Orders", "orders space", "orders..99", strings.Repeat("a", 101), "private-", "!bad"}
	for _, c := range invalid {
		if validChannel(c) {
			t.Errorf("seharusnya invalid: %q", c)
		}
	}
}

func TestVerifyAuth(t *testing.T) {
	secret := "s3cr3t"
	socketID, channel := "ws_abc", "private-orders.1"
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(socketID + ":" + channel))
	good := "anyappkey:" + hex.EncodeToString(mac.Sum(nil))

	if !verifyAuth(secret, socketID, channel, nil, good) {
		t.Fatal("signature valid harus diterima")
	}
	if verifyAuth(secret, socketID, channel, nil, good+"00") {
		t.Fatal("signature salah harus ditolak")
	}
	if verifyAuth(secret, socketID, channel, nil, "tanpa-titik-dua") {
		t.Fatal("format tanpa ':' harus ditolak")
	}
	if verifyAuth("secret-lain", socketID, channel, nil, good) {
		t.Fatal("secret beda harus ditolak")
	}
}

func TestChannelInApp(t *testing.T) {
	// Tanpa app → semua channel diizinkan (backward-compatible).
	for _, ch := range []string{"orders", "other.x", "private-foo", "presence-room"} {
		if !channelInApp("", ch) {
			t.Errorf("appID kosong harus mengizinkan %q", ch)
		}
	}
	// Dengan app "acme" → hanya namespace acme.
	ok := []string{"acme", "acme.orders", "acme.orders.99", "private-acme.x", "presence-acme.room", "private-encrypted-acme.s"}
	for _, ch := range ok {
		if !channelInApp("acme", ch) {
			t.Errorf("app acme harus mengizinkan %q", ch)
		}
	}
	deny := []string{"other", "other.x", "acmex", "private-other.x", "presence-other"}
	for _, ch := range deny {
		if channelInApp("acme", ch) {
			t.Errorf("app acme harus menolak %q", ch)
		}
	}
}

func TestNewSocketID(t *testing.T) {
	a, b := newSocketID(), newSocketID()
	if !strings.HasPrefix(a, "ws_") {
		t.Fatalf("socket id harus berawalan ws_, got %q", a)
	}
	if a == b {
		t.Fatal("socket id harus unik antar pemanggilan")
	}
}
