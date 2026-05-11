// Package extensions mendefinisikan extension points agar Gateway Core
// dapat diperluas oleh SaaS Control Plane tanpa memodifikasi source code.
// Semua interface memiliki default no-op implementation.
package extensions

import (
	"net/http"
)

// ExtensionPoints adalah struct yang diinject oleh main.go.
// SaaS Control Plane tinggal override field ini saat kompilasi binary cloud.
type ExtensionPoints struct {
	Auth        Authenticator
	RateLimiter RateLimiter
	EventHook   EventHook
}

// Authenticator memvalidasi request. Default: JWT HMAC-SHA256.
// SaaS implementation bisa inject multi-tenant auth, API key, OAuth.
type Authenticator interface {
	Authenticate(r *http.Request) (userID string, tenantID string, ok bool)
}

// RateLimiter membatasi request per tenant/app/user.
// Default: no limit (open source self-hosted).
// SaaS implementation: Redis token bucket, sliding window, atau tier-based.
type RateLimiter interface {
	Allow(tenantID string, key string, limit int) bool
}

// EventHook menangkap event lifecycle untuk billing & audit.
// Default: no-op. SaaS implementation bisa publish ke Kafka, log DB, atau usage tracker.
type EventHook interface {
	OnPublish(tenantID string, channel string, event string, payloadSize int64)
	OnSubscribe(tenantID string, channel string, socketID string)
	OnUnsubscribe(tenantID string, channel string, socketID string)
	OnConnect(tenantID string, socketID string)
	OnDisconnect(tenantID string, socketID string)
}

// NoopAuth adalah default Authenticator — digunakan jika SaaS tidak mengoverride.
type NoopAuth struct{}

func (NoopAuth) Authenticate(r *http.Request) (string, string, bool) {
	return "", "", false
}

// NoopRateLimiter adalah default RateLimiter — selalu allow.
type NoopRateLimiter struct{}

func (NoopRateLimiter) Allow(tenantID string, key string, limit int) bool {
	return true
}

// NoopEventHook adalah default EventHook — tidak melakukan apa-apa.
type NoopEventHook struct{}

func (NoopEventHook) OnPublish(tenantID string, channel string, event string, payloadSize int64) {}
func (NoopEventHook) OnSubscribe(tenantID string, channel string, socketID string)               {}
func (NoopEventHook) OnUnsubscribe(tenantID string, channel string, socketID string)             {}
func (NoopEventHook) OnConnect(tenantID string, socketID string)                                 {}
func (NoopEventHook) OnDisconnect(tenantID string, socketID string)                              {}
