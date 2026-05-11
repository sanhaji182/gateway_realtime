FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o gateway-server .

FROM alpine:3.20
RUN adduser -D -H gateway
WORKDIR /app
COPY --from=builder /app/gateway-server /app/gateway-server
USER gateway
EXPOSE 3000
ENTRYPOINT ["/app/gateway-server"]
