// Package main adalah entrypoint service WebSocket gateway.
// File ini mengikat konfigurasi, Redis, Hub, HTTP routes, goroutine background, dan graceful shutdown.
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"go-gateway/config"
	"go-gateway/handler"
	"go-gateway/hub"
	redisSub "go-gateway/redis"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// main melakukan bootstrap seluruh dependency dan memblokir sampai menerima sinyal shutdown.
// Goroutine utama memiliki lifecycle aplikasi dan bertanggung jawab menutup HTTP server serta Redis client.
func main() {
	cfg := config.Load()
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		// Level invalid tidak fatal; fallback info menjaga log production tetap muncul.
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)
	logger := log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
	if cfg.JWTSecret == "" {
		// JWT secret wajib karena tanpa secret gateway tidak bisa membedakan token sah dan palsu.
		logger.Error().Msg("JWT_SECRET is required")
		os.Exit(1)
	}
	opt, err := goredis.ParseURL(cfg.RedisURL)
	if err != nil {
		// URL Redis invalid adalah kesalahan konfigurasi fatal, jadi service dihentikan sebelum menerima traffic.
		logger.Error().Err(err).Msg("invalid REDIS_URL")
		os.Exit(1)
	}
	redisClient := goredis.NewClient(opt)
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		// Redis awal gagal tidak langsung fatal agar health endpoint tetap bisa memberi status error ke operator.
		logger.Error().Err(err).Msg("redis ping failed")
	}
	h := hub.New(logger)
	ctx, cancel := context.WithCancel(context.Background())
	// Goroutine subscriber membaca Redis Pub/Sub dan berhenti saat context dibatalkan pada shutdown.
	// Goroutine ini memiliki subscription Redis, sedangkan Hub tetap shared dan thread-safe.
	go (redisSub.Subscriber{Client: redisClient, Hub: h, Log: logger}).Run(ctx)
	mux := http.NewServeMux()
	mux.Handle("/ws", handler.WSHandler{Config: cfg, Hub: h, Log: logger})
	mux.Handle("/health", handler.HealthHandler{Hub: h, Redis: redisClient})
	mux.Handle("/api/socket/auth", handler.AuthHandler{Config: cfg, Hub: h, Log: logger})
	mux.HandleFunc("/sdk/gateway.js", sdkHandler)
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		// Metrics membaca Hub dengan RLock internal sehingga aman dipanggil bersamaan dengan register/unregister.
		fmt.Fprintf(w, "gateway_connections %d\n", h.Connections())
	})
	server := &http.Server{Addr: ":" + cfg.Port, Handler: corsMiddleware(cfg.AllowedOrigins, mux), ReadHeaderTimeout: 10 * time.Second}
	// Goroutine HTTP server menerima request sampai Shutdown dipanggil atau ListenAndServe gagal.
	// Kepemilikan socket listener ada pada http.Server; goroutine utama hanya menunggu sinyal OS.
	go func() {
		logger.Info().Str("addr", server.Addr).Msg("gateway server started")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			// Error selain ErrServerClosed berarti server berhenti tidak terduga dan harus terlihat di log.
			logger.Error().Err(err).Msg("http server failed")
		}
	}()
	// Buffer 1 mencegah signal.Notify blocking jika sinyal datang sebelum goroutine utama menerima.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	// Receive ini blocking sampai proses mendapat interrupt atau SIGTERM dari orchestrator/systemd.
	<-stop
	logger.Info().Msg("gateway shutting down")
	// Cancel menghentikan goroutine subscriber Redis secara kooperatif.
	cancel()
	// Timeout 5 detik mengikuti requirement cleanup agar shutdown tidak menggantung tanpa batas.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		// Shutdown error dilog karena proses tetap harus lanjut menutup dependency lain.
		logger.Error().Err(err).Msg("http shutdown failed")
	}
	if err := redisClient.Close(); err != nil {
		// Close Redis error tidak bisa dipulihkan saat shutdown, jadi cukup dicatat.
		logger.Error().Err(err).Msg("redis close failed")
	}
}

// corsMiddleware memasang header CORS global sebelum request masuk ke handler spesifik.
// OPTIONS dijawab langsung agar preflight tidak memicu validasi WebSocket atau auth.
func corsMiddleware(allowed []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, allowed, r.Header.Get("Origin"))
		if r.Method == http.MethodOptions {
			return
		}
		next.ServeHTTP(w, r)
	})
}

// setCORSHeaders memilih Access-Control-Allow-Origin berdasarkan allowlist konfigurasi.
// Wildcard didukung untuk lokal, tetapi production sebaiknya memakai origin eksplisit.
func setCORSHeaders(w http.ResponseWriter, allowed []string, origin string) {
	for _, candidate := range allowed {
		if candidate == "*" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			break
		}
		if candidate == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
	}
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
}

// sdkHandler menyajikan SDK browser minimal sesuai kontrak GatewayClient.
// SDK ditanam sebagai string agar gateway tetap single binary tanpa asset pipeline tambahan.
func sdkHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/javascript")
	_, _ = w.Write([]byte(strings.TrimSpace(`
class GatewayClient{constructor(o){this.o=o;this.ws=null;this.socketId=null;this.handlers={};this.channels=new Map();this.attempt=0;if(o.autoReconnect!==false)this.autoReconnect=true}on(e,h){(this.handlers[e]||(this.handlers[e]=new Set())).add(h);return this}off(e,h){if(this.handlers[e])this.handlers[e].delete(h);return this}bind(e,h){return this.on(e,h)}unbind(e,h){return this.off(e,h)}emit(e,d){(this.handlers[e]||[]).forEach(h=>{try{h(d)}catch(_){}})}connect(token){const host=this.o.host.replace(/^http/,'ws');this.ws=new WebSocket(host+'/ws?token='+encodeURIComponent(token));this.ws.onopen=()=>{this.attempt=0};this.ws.onmessage=e=>this.route(JSON.parse(e.data));this.ws.onclose=e=>{this.emit('disconnected',{reason:e.reason});if(this.autoReconnect)this.reconnect(token)};this.ws.onerror=()=>this.emit('error',{code:'WS_ERROR',message:'WebSocket error'})}disconnect(){this.autoReconnect=false;if(this.ws)this.ws.close()}subscribe(name,opt={}){const ch=new GatewayChannel(this,name);this.channels.set(name,ch);const send=a=>this.ws&&this.ws.readyState===1&&this.ws.send(JSON.stringify(a));if(name.startsWith('private-')||name.startsWith('presence-')){opt.auth({socket_id:this.socketId,channel_name:name}).then(r=>r.json?r.json():r).then(r=>send({type:'subscribe',channel:name,auth:r.data.auth,channel_data:r.data.channel_data}))}else send({type:'subscribe',channel:name});return ch}unsubscribe(n){if(this.ws)this.ws.send(JSON.stringify({type:'unsubscribe',channel:n}));this.channels.delete(n)}route(m){if(m.type==='system'){if(m.event==='connected'){this.socketId=m.data.socketId;this.emit('connected',m.data);this.channels.forEach((_,n)=>this.subscribe(n))}this.emit(m.event,m.data);const ch=this.channels.get(m.channel);if(ch)ch.emit(m.event,m.data);return}const ch=this.channels.get(m.channel);if(ch)ch.emit(m.event,m.data);this.emit(m.event,m.data)}reconnect(token){const d=Math.min(30000,1000*Math.pow(2,this.attempt++));this.emit('reconnecting',{attempt:this.attempt,delayMs:d});setTimeout(()=>this.connect(token),d)}}
class GatewayChannel{constructor(c,n){this.client=c;this.name=n;this.handlers={}}on(e,h){(this.handlers[e]||(this.handlers[e]=new Set())).add(h);return this}off(e,h){if(this.handlers[e])this.handlers[e].delete(h);return this}emit(e,d){(this.handlers[e]||[]).forEach(h=>h(d));(this.handlers['*']||[]).forEach(h=>h(e,d))}unsubscribe(){this.client.unsubscribe(this.name)}}
window.GatewayClient=GatewayClient;
`)))
}
