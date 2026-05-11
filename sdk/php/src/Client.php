<?php

namespace Gateway;

/**
 * Gateway PHP SDK — 5 lines to publish realtime events.
 *
 * Usage:
 *   $gw = new Gateway\Client('pk_live_xxx', 'sk_live_xxx', 'https://gateway.internal/api/v1');
 *   $gw->publish('orders.99', 'order.paid', ['order_id' => 99, 'amount' => 150000]);
 */
class Client
{
    private string $appKey;
    private string $appSecret;
    private string $baseUrl;

    public function __construct(string $appKey, string $appSecret, string $baseUrl = 'https://gateway.internal/api/v1')
    {
        $this->appKey = $appKey;
        $this->appSecret = $appSecret;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /**
     * Publish a single event to a channel.
     *
     * @param string $channel  Channel name (e.g. "orders.99")
     * @param string $event    Event name (e.g. "order.paid")
     * @param mixed  $data     Event payload (array or object)
     * @param string|null $socketId  Exclude this socket from broadcast
     * @return array{ok: bool, status: int, body?: string}
     */
    public function publish(string $channel, string $event, $data, ?string $socketId = null): array
    {
        return $this->send('/events', [
            'channel' => $channel,
            'event' => $event,
            'data' => $data,
            'socket_id' => $socketId,
        ]);
    }

    /**
     * Publish multiple events in batch (max 100).
     *
     * @param array<int, array{channel:string, event:string, data:mixed, socket_id?:string}> $batch
     * @return array{published: int, failed: int, results: array}
     */
    public function publishBatch(array $batch): array
    {
        return $this->send('/events/batch', ['batch' => $batch]);
    }

    private function send(string $path, array $payload): array
    {
        $body = json_encode($payload);
        if ($body === false) {
            return ['ok' => false, 'status' => 0, 'body' => 'JSON encode failed'];
        }

        $signature = hash_hmac('sha256', $body, $this->appSecret);

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-App-Key: ' . $this->appKey,
                'X-Signature: ' . $signature,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);

        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'body' => $response];
    }
}
