// Package main adalah entrypoint service WebSocket gateway.
// File ini mengikat konfigurasi, Redis, Hub, HTTP routes, goroutine background, dan graceful shutdown.
// Extension points (extensions.ExtensionPoints) memungkinkan SaaS Control Plane menginject
// Authenticator, RateLimiter, dan EventHook tanpa memodifikasi source code core.
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
	"go-gateway/extensions"
	"go-gateway/handler"
	"go-gateway/hub"
	redisSub "go-gateway/redis"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// ExtensionPoints memungkinkan SaaS Control Plane mengoverride perilaku default.
// Nil default: no-op auth, no rate limit, no event hooks.
// Build SaaS binary dengan:
//   main.Ext = extensions.ExtensionPoints{...}
// lalu go build -o gateway-cloud .
var Ext = extensions.ExtensionPoints{
	Auth:        extensions.NoopAuth{},
	RateLimiter: extensions.NoopRateLimiter{},
	EventHook:   extensions.NoopEventHook{},
}

// main melakukan bootstrap seluruh dependency dan memblokir sampai menerima sinyal shutdown.
// Goroutine utama memiliki lifecycle aplikasi dan bertanggung jawab menutup HTTP server serta Redis client.
func main() {
	cfg := config.Load()
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)
	logger := log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
	if cfg.JWTSecret == "" {
		logger.Error().Msg("JWT_SECRET is required")
		os.Exit(1)
	}
	opt, err := goredis.ParseURL(cfg.RedisURL)
	if err != nil {
		logger.Error().Err(err).Msg("invalid REDIS_URL")
		os.Exit(1)
	}
	redisClient := goredis.NewClient(opt)
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		logger.Error().Err(err).Msg("redis ping failed")
	}
	h := hub.New(logger)
	ctx, cancel := context.WithCancel(context.Background())
	go (redisSub.Subscriber{Client: redisClient, Hub: h, Log: logger}).Run(ctx)
	mux := http.NewServeMux()
	mux.Handle("/ws", handler.WSHandler{
		Config: cfg, Hub: h, Log: logger,
		EventHook: Ext.EventHook, RateLimiter: Ext.RateLimiter, Auth: Ext.Auth,
	})
	mux.Handle("/health", handler.HealthHandler{Hub: h, Redis: redisClient})
	mux.Handle("/api/socket/auth", handler.AuthHandler{
		Config: cfg, Hub: h, Log: logger,
		EventHook: Ext.EventHook, RateLimiter: Ext.RateLimiter, Auth: Ext.Auth,
	})
	mux.HandleFunc("/sdk/gateway.js", sdkHandler)
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "gateway_connections %d\n", h.Connections())
	})
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           corsMiddleware(cfg.AllowedOrigins, mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		logger.Info().Str("addr", server.Addr).Msg("gateway server started")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error().Err(err).Msg("http server failed")
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	logger.Info().Msg("gateway shutting down")
	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("http shutdown failed")
	}
	if err := redisClient.Close(); err != nil {
		logger.Error().Err(err).Msg("redis close failed")
	}
}

func corsMiddleware(allowed []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, allowed, r.Header.Get("Origin"))
		if r.Method == http.MethodOptions {
			return
		}
		next.ServeHTTP(w, r)
	})
}

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

func sdkHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/javascript")
	_, _ = w.Write([]byte(strings.TrimSpace(`
class GatewayClient{constructor(o){this.o=o;this.ws=null;this.socketId=null;this.handlers={};this.channels=new Map();this.attempt=0;if(o.autoReconnect!==false)this.autoReconnect=true}on(e,h){(this.handlers[e]||(this.handlers[e]=new Set())).add(h);return this}off(e,h){if(this.handlers[e])this.handlers[e].delete(h);return this}bind(e,h){return this.on(e,h)}unbind(e,h){return this.off(e,h)}emit(e,d){(this.handlers[e]||[]).forEach(h=>{try{h(d)}catch(_){}})}connect(token){const host=this.o.host.replace(/^http/,'ws');this.ws=new WebSocket(host+'/ws?token='+encodeURIComponent(token));this.ws.onopen=()=>{this.attempt=0};this.ws.onmessage=e=>this.route(JSON.parse(e.data));this.ws.onclose=e=>{this.emit('disconnected',{reason:e.reason});if(this.autoReconnect)this.reconnect(token)};this.ws.onerror=()=>this.emit('error',{code:'WS_ERROR',message:'WebSocket error'})}disconnect(){this.autoReconnect=false;if(this.ws)this.ws.close()}subscribe(name,opt={}){const ch=new GatewayChannel(this,name);this.channels.set(name,ch);const send=a=>this.ws&&this.ws.readyState===1&&this.ws.send(JSON.stringify(a));if(name.startsWith('private-')||name.startsWith('presence-')){opt.auth({socket_id:this.socketId,channel_name:name}).then(r=>r.json?r.json():r).then(r=>send({type:'subscribe',channel:name,auth:r.data.auth,channel_data:r.data.channel_data}))}else send({type:'subscribe',channel:name});return ch}unsubscribe(n){if(this.ws)this.ws.send(JSON.stringify({type:'unsubscribe',channel:n}));this.channels.delete(n)}route(m){if(m.type==='system'){if(m.event==='connected'){this.socketId=m.data.socketId;this.emit('connected',m.data);this.channels.forEach((_,n)=>this.subscribe(n))}this.emit(m.event,m.data);const ch=this.channels.get(m.channel);if(ch)ch.emit(m.event,m.data);return}const ch=this.channels.get(m.channel);if(ch)ch.emit(m.event,m.data);this.emit(m.event,m.data)}reconnect(token){const d=Math.min(30000,1000*Math.pow(2,this.attempt++));this.emit('reconnecting',{attempt:this.attempt,delayMs:d});setTimeout(()=>this.connect(token),d)}}
class GatewayChannel{constructor(c,n){this.client=c;this.name=n;this.handlers={}}on(e,h){(this.handlers[e]||(this.handlers[e]=new Set())).add(h);return this}off(e,h){if(this.handlers[e])this.handlers[e].delete(h);return this}emit(e,d){(this.handlers[e]||[]).forEach(h=>h(d));(this.handlers['*']||[]).forEach(h=>h(e,d))}unsubscribe(){this.client.unsubscribe(this.name)}}
window.GatewayClient=GatewayClient;
`)))
}
