# ETag ミドルウェア

このミドルウェアを使用すると、 ETag ヘッダーを簡単に追加できます。

## Import

```ts
import { Hono } from 'hono'
import { etag } from 'hono/etag'
```

## 使い方

```ts
const app = new Hono()

app.use('/etag/*', etag())
app.get('/etag/abc', (c) => {
  return c.text('Hono is cool')
})
```

## 保持されるヘッダー

304 レスポンスには、同等の 200 OK レスポンスで送信されるはずだったヘッダーを含める必要があります。 デフォルトのヘッダーは、 Cache-Control 、 Content-Location 、 Date 、 ETag 、 Expires 、 Vary です。

送信されるヘッダーを追加したい場合は、 `retainedHeaders` オプションと、デフォルトのヘッダーを含む `RETAINED_304_HEADERS` 文字列配列変数を使用できます:

```ts
import { etag, RETAINED_304_HEADERS } from 'hono/etag'

// ...

app.use(
  '/etag/*',
  etag({
    retainedHeaders: ['x-message', ...RETAINED_304_HEADERS],
  })
)
```

## オプション

### <Badge type="info" text="optional" /> weak: `boolean`

[弱い検証](https://developer.mozilla.org/ja/docs/Web/HTTP/Conditional_requests#weak_validation) を使用するかどうかを定義します。 `true` が設定されると、値のプレフィックスに `w/` が追加されます。 デフォルトは `false` です。

### <Badge type="info" text="optional" /> retainedHeaders: `string[]`

304 レスポンスに保持したいヘッダーです。

### <Badge type="info" text="optional" /> generateDigest: `(body: Uint8Array) => ArrayBuffer | Promise<ArrayBuffer>`

カスタムダイジェスト生成関数です。 デフォルトでは `SHA-1` を使用します。 この関数はレスポンスボディを `Uint8Array` として受け取り、ハッシュを `ArrayBuffer` またはその Promise として返す必要があります。
