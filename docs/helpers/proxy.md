# プロキシヘルパー

Proxy Helper は、 Hono アプリケーションを (リバース) プロキシとして使用する際に役立つ関数を提供します。

## Import

```ts
import { Hono } from 'hono'
import { proxy } from 'hono/proxy'
```

## `proxy()`

`proxy()` は、プロキシのための `fetch()` API ラッパーです。 引数と戻り値は `fetch()` と同じです (プロキシ固有のオプションを除く)。

`Accept-Encoding` ヘッダーは、現在のランタイムが処理できるエンコーディングに置き換えられます。 不要なレスポンスヘッダーは削除され、ハンドラーから送信できる `Response` オブジェクトが返されます。

### 例

シンプルな使い方:

```ts
app.get('/proxy/:path', (c) => {
  return proxy(`http://${originServer}/${c.req.param('path')}`)
})
```

複雑な使い方:

```ts
app.get('/proxy/:path', async (c) => {
  const res = await proxy(
    `http://${originServer}/${c.req.param('path')}`,
    {
      headers: {
        ...c.req.header(), // optional, specify only when forwarding all the request data (including credentials) is necessary.
        'X-Forwarded-For': '127.0.0.1',
        'X-Forwarded-Host': c.req.header('host'),
        Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
      },
    }
  )
  res.headers.delete('Set-Cookie')
  return res
})
```

または、 `c.req` を引数として渡すこともできます。

```ts
app.all('/proxy/:path', (c) => {
  return proxy(`http://${originServer}/${c.req.param('path')}`, {
    ...c.req, // optional, specify only when forwarding all the request data (including credentials) is necessary.
    headers: {
      ...c.req.header(),
      'X-Forwarded-For': '127.0.0.1',
      'X-Forwarded-Host': c.req.header('host'),
      Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
    },
  })
})
```

`customFetch` オプションで、デフォルトのグローバル `fetch` 関数をオーバーライドできます:

```ts
app.get('/proxy', (c) => {
  return proxy('https://example.com/', {
    customFetch,
  })
})
```

### Connection ヘッダーの処理

デフォルトでは、 `proxy()` は Hop-by-Hop ヘッダーインジェクション攻撃を防ぐために `Connection` ヘッダーを無視します。 `strictConnectionProcessing` オプションで、厳密な RFC 9110 準拠を有効にできます:

```ts
// Default behavior (recommended for untrusted clients)
app.get('/proxy/:path', (c) => {
  return proxy(`http://${originServer}/${c.req.param('path')}`, c.req)
})

// Strict RFC 9110 compliance (use only in trusted environments)
app.get('/internal-proxy/:path', (c) => {
  return proxy(`http://${internalServer}/${c.req.param('path')}`, {
    ...c.req,
    strictConnectionProcessing: true,
  })
})
```

### `ProxyFetch`

`proxy()` の型は `ProxyFetch` として定義されており、以下の通りです

```ts
interface ProxyRequestInit extends Omit<RequestInit, 'headers'> {
  raw?: Request
  customFetch?: (request: Request) => Promise<Response>
  strictConnectionProcessing?: boolean
  headers?:
    | HeadersInit
    | [string, string][]
    | Record<RequestHeader, string | undefined>
    | Record<string, string | undefined>
}

interface ProxyFetch {
  (
    input: string | URL | Request,
    init?: ProxyRequestInit
  ): Promise<Response>
}
```
