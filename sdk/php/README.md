# Gateway PHP SDK

Publish realtime events to Gateway from your PHP/Laravel/CI4 backend — 5 lines of code.

## Install

```bash
composer require gateway/gateway-php
```

## Usage

```php
use Gateway\Client;

$gw = new Client(
    appKey:    'pk_live_xxx',   // From dashboard → App Detail
    appSecret: 'sk_live_xxx',   // Keep this secret!
    baseUrl:   'https://gateway.internal/api/v1'
);

// Single event
$gw->publish('orders.99', 'order.paid', [
    'order_id' => 99,
    'buyer_id' => 42,
    'amount'   => 150000,
    'currency' => 'IDR',
]);

// Batch events
$gw->publishBatch([
    ['channel' => 'orders.99',  'event' => 'order.paid',    'data' => $order1],
    ['channel' => 'orders.42',  'event' => 'order.shipped',  'data' => $order2],
    ['channel' => 'chat.55',    'event' => 'message.new',    'data' => $message],
]);
```

## Laravel / CI4 Integration

```php
// config/gateway.php
return [
    'key'    => env('GW_APP_KEY'),
    'secret' => env('GW_APP_SECRET'),
    'url'    => env('GW_API_URL', 'https://gateway.internal/api/v1'),
];

// AppServiceProvider.php
$this->app->singleton(\Gateway\Client::class, fn () => new \Gateway\Client(
    config('gateway.key'),
    config('gateway.secret'),
    config('gateway.url'),
));

// Any controller
public function confirmOrder(Order $order) {
    $order->markAsPaid();
    app(\Gateway\Client::class)->publish("orders.{$order->id}", 'order.paid', $order->toArray());
}
```

## Requirements

- PHP >= 8.1
- ext-curl
