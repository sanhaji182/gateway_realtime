package ratelimit

import (
	"sync"
	"time"
)

type bucket struct {
	tokens    float64
	lastCheck time.Time
}

// IPLimiter is an in-memory token bucket rate limiter per IP.
// Used as default protection for self-hosted deployments.
type IPLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64  // tokens per second
	burst   float64  // max tokens
	cleanup time.Time
}

func NewIPLimiter(rate, burst float64) *IPLimiter {
	return &IPLimiter{
		buckets: make(map[string]*bucket),
		rate:    rate,
		burst:   burst,
		cleanup: time.Now(),
	}
}

func (l *IPLimiter) Allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	// Cleanup old entries every minute
	if time.Since(l.cleanup) > time.Minute {
		for ip, b := range l.buckets {
			if time.Since(b.lastCheck) > 5*time.Minute {
				delete(l.buckets, ip)
			}
		}
		l.cleanup = time.Now()
	}

	b, ok := l.buckets[ip]
	if !ok {
		b = &bucket{tokens: l.burst, lastCheck: time.Now()}
		l.buckets[ip] = b
	}

	elapsed := time.Since(b.lastCheck).Seconds()
	b.tokens += elapsed * l.rate
	if b.tokens > l.burst {
		b.tokens = l.burst
	}
	b.lastCheck = time.Now()

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}
