# Request ID ミドルウェア

Request ID Middleware は、各リクエストに対して一意の ID を生成し、ハンドラー内で使用できます。

::: info
**Node.js**: このミドルウェアは `crypto.randomUUID()` を使って ID を生成します。 グローバルな `crypto` は Node.js のバージョン 20 以降で導入されました。 そのため、それより前のバージョンではエラーが発生する可能性があります。 その場合は `generator` を指定してください。 ただし、 [Node.js アダプタ](https://github.com/honojs/node-server) を使用している場合は、 `crypto` が自動的にグローバルに設定されるため、この必要はありません。
:::

## Import

```ts
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
```

## 使い方

Request ID Middleware が適用されたハンドラーやミドルウェアでは、 `requestId` 変数を通して Request ID にアクセスできます。

```ts
const app = new Hono()

app.use('*', requestId())

app.get('/', (c) => {
  return c.text(`Your request id is ${c.get('requestId')}`)
})
```

型を明示的に指定したい場合は、 `RequestIdVariables` をインポートして、 `new Hono()` のジェネリクスに渡します。

```ts
import type { RequestIdVariables } from 'hono/request-id'

const app = new Hono<{
  Variables: RequestIdVariables
}>()
```

### Request ID の設定

ヘッダー (デフォルト: `X-Request-Id`) にカスタム Request ID を設定すると、ミドルウェアは新しい ID を生成する代わりにその値を使用します:

```ts
const app = new Hono()

app.use('*', requestId())

app.get('/', (c) => {
  return c.text(`${c.get('requestId')}`)
})

const res = await app.request('/', {
  headers: {
    'X-Request-Id': 'your-custom-id',
  },
})
console.log(await res.text()) // your-custom-id
```

この機能を無効にしたい場合は、 [`headerName` オプション](#headername-string) に空文字列を設定してください。

## オプション

### <Badge type="info" text="optional" /> limitLength: `number`

Request ID の最大長です。 デフォルトは `255` です。

### <Badge type="info" text="optional" /> headerName: `string`

Request ID に使用されるヘッダー名です。 デフォルトは `X-Request-Id` です。

### <Badge type="info" text="optional" /> generator: `(c: Context) => string`

Request ID の生成関数です。 デフォルトでは `crypto.randomUUID()` を使用します。

## プラットフォーム固有の Request ID

一部のプラットフォーム (AWS Lambda など) は、リクエストごとに独自の Request ID を既に生成しています。
追加の設定を行わない場合、このミドルウェアはこれらのプラットフォーム固有の Request ID を認識せず、
新しい Request ID を生成します。 これにより、アプリケーションのログを見るときに混乱が生じる可能性があります。

これらの ID を統一するには、 `generator` 関数を使ってプラットフォーム固有の Request ID を取得し、このミドルウェアで使用します。

### プラットフォーム固有のリンク

- AWS Lambda
  - [AWS documentation: Context object](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html)
  - [Hono: Access AWS Lambda Object](/docs/getting-started/aws-lambda#access-aws-lambda-object)
- Cloudflare
  - [Cloudflare Ray ID
    ](https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/)
- Deno
  - [Request ID on the Deno Blog](https://deno.com/blog/zero-config-debugging-deno-opentelemetry#:~:text=s%20automatically%20have-,unique%20request%20IDs,-associated%20with%20them)
- Fastly
  - [Fastly documentation: req.xid](https://www.fastly.com/documentation/reference/vcl/variables/client-request/req-xid/)
