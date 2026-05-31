package ratelimit

import (
	"testing"
	"time"
)

func TestIPLimiterBurstDanDeny(t *testing.T) {
	// rate 0 token/detik, burst 3 → hanya 3 request pertama yang lolos.
	l := NewIPLimiter(0, 3)
	allowed := 0
	for i := 0; i < 5; i++ {
		if l.Allow("1.2.3.4") {
			allowed++
		}
	}
	if allowed != 3 {
		t.Fatalf("burst 3 harus mengizinkan tepat 3 request, got %d", allowed)
	}
}

func TestIPLimiterRefill(t *testing.T) {
	// rate 100/detik, burst 1 → setelah habis, terisi lagi dalam ~10ms.
	l := NewIPLimiter(100, 1)
	if !l.Allow("ip") {
		t.Fatal("request pertama harus lolos")
	}
	if l.Allow("ip") {
		t.Fatal("request kedua langsung harus ditolak")
	}
	time.Sleep(20 * time.Millisecond)
	if !l.Allow("ip") {
		t.Fatal("setelah refill harus lolos lagi")
	}
}

func TestIPLimiterPerIP(t *testing.T) {
	// Limit dihitung per-IP, bukan global.
	l := NewIPLimiter(0, 1)
	if !l.Allow("a") || !l.Allow("b") {
		t.Fatal("dua IP berbeda masing-masing punya kuota sendiri")
	}
	if l.Allow("a") {
		t.Fatal("IP a sudah habis kuotanya")
	}
}
