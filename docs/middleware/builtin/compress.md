# Compress ミドルウェア

このミドルウェアは、 `Accept-Encoding` リクエストヘッダーに応じてレスポンスボディを圧縮します。

::: info
**Note**: Cloudflare Workers と Deno Deploy では、レスポンスボディは自動的に圧縮されるため、このミドルウェアを使用する必要はありません。
:::

## Import

```ts
import { Hono } from 'hono'
import { compress } from 'hono/compress'
```

## 使い方

```ts
const app = new Hono()

app.use(compress())
```

## オプション

### <Badge type="info" text="optional" /> encoding: `'gzip'` | `'deflate'`

レスポンスの圧縮に許可する圧縮方式です。 `gzip` または `deflate` のいずれかです。 定義しない場合は両方が許可され、 `Accept-Encoding` ヘッダーに基づいて使用されます。 このオプションが指定されておらず、クライアントが `Accept-Encoding` ヘッダーで両方を指定している場合は、 `gzip` が優先されます。

### <Badge type="info" text="optional" /> threshold: `number`

圧縮する最小サイズ (バイト) です。 デフォルトは 1024 バイトです。

### <Badge type="info" text="optional" /> contentTypeFilter: `RegExp` | `(contentType: string) => boolean`

`Content-Type` に基づいてレスポンスを圧縮するかどうかを判定するための `RegExp` または関数です。 デフォルトでは、組み込みの圧縮可能な Content-Type のリストが使用されます。

マッチする Content-Types のみを圧縮したい場合は、 `RegExp` を渡せます:

```ts
// Compress only JSON responses
app.use(compress({ contentTypeFilter: /^application\/json/ }))
```

または、カスタムロジックのために関数を渡せます。 組み込みの `COMPRESSIBLE_CONTENT_TYPE_REGEX` もエクスポートされているので、デフォルトの挙動を拡張できます:

```ts
import {
  compress,
  COMPRESSIBLE_CONTENT_TYPE_REGEX,
} from 'hono/compress'

// Compress the default Content-Types plus a custom one
app.use(
  compress({
    contentTypeFilter: (type) =>
      COMPRESSIBLE_CONTENT_TYPE_REGEX.test(type) ||
      type === 'application/x-myformat',
  })
)
```
