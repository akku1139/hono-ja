# CORS ミドルウェア

Web API としての Cloudflare Workers のユースケースは多く、外部のフロントエンドアプリケーションから呼び出されます。
そのためには CORS を実装する必要があります。 これもミドルウェアで実装しましょう。

## Import

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
```

## 使い方

```ts
const app = new Hono()

// CORS should be called before the route
app.use('/api/*', cors())
app.use(
  '/api2/*',
  cors({
    origin: 'http://example.com',
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
  })
)

app.all('/api/abc', (c) => {
  return c.json({ success: true })
})
app.all('/api2/abc', (c) => {
  return c.json({ success: true })
})
```

複数のオリジン:

```ts
app.use(
  '/api3/*',
  cors({
    origin: ['https://example.com', 'https://example.org'],
  })
)

// Or you can use "function"
app.use(
  '/api4/*',
  cors({
    // `c` is a `Context` object
    origin: (origin, c) => {
      return origin.endsWith('.example.com')
        ? origin
        : 'http://example.com'
    },
  })
)
```

オリジンに基づく動的な許可メソッド:

```ts
app.use(
  '/api5/*',
  cors({
    origin: (origin) =>
      origin === 'https://example.com' ? origin : '*',
    // `c` is a `Context` object
    allowMethods: (origin, c) =>
      origin === 'https://example.com'
        ? ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']
        : ['GET', 'HEAD'],
  })
)
```

## オプション

### <Badge type="info" text="optional" /> origin: `string` | `string[]` | `(origin:string, c:Context) => string`

"_Access-Control-Allow-Origin_" CORS ヘッダーの値です。 `origin: (origin) => (origin.endsWith('.example.com') ? origin : 'http://example.com')` のようなコールバック関数を渡すこともできます。 デフォルトは `*` です。

### <Badge type="info" text="optional" /> allowMethods: `string[]` | `(origin:string, c:Context) => string[]`

"_Access-Control-Allow-Methods_" CORS ヘッダーの値です。 オリジンに基づいて許可メソッドを動的に決定するコールバック関数を渡すこともできます。 デフォルトは `['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'QUERY']` です。

### <Badge type="info" text="optional" /> allowHeaders: `string[]`

"_Access-Control-Allow-Headers_" CORS ヘッダーの値です。 デフォルトは `[]` です。

### <Badge type="info" text="optional" /> maxAge: `number`

"_Access-Control-Max-Age_" CORS ヘッダーの値です。

### <Badge type="info" text="optional" /> credentials: `boolean`

"_Access-Control-Allow-Credentials_" CORS ヘッダーの値です。

### <Badge type="info" text="optional" /> exposeHeaders: `string[]`

"_Access-Control-Expose-Headers_" CORS ヘッダーの値です。 デフォルトは `[]` です。

## 環境に依存する CORS の設定

開発環境や本番環境など、実行環境に応じて CORS の設定を調整したい場合は、環境変数から値を注入すると便利です。 これにより、アプリケーションが自身の実行環境を意識する必要がなくなります。 以下の例を参考にしてください。

```ts
app.use('*', async (c, next) => {
  const corsMiddlewareHandler = cors({
    origin: c.env.CORS_ORIGIN,
  })
  return corsMiddlewareHandler(c, next)
})
```

## Vite との併用

Hono を Vite と併用する場合は、 `vite.config.ts` で `server.cors` を `false` に設定して、 Vite の組み込み CORS 機能を無効にする必要があります。 これは、 Hono の CORS ミドルウェアとの競合を防ぎます。

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    cors: false, // disable Vite's built-in CORS setting
  },
  plugins: [cloudflare()],
})
```
