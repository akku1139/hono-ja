# Body Limit ミドルウェア

Body Limit ミドルウェアは、リクエストボディのファイルサイズを制限できます。

このミドルウェアは、まずリクエスト内の `Content-Length` ヘッダーの値を使用します (存在する場合)。
設定されていない場合は、ボディをストリームとして読み込み、指定されたファイルサイズより大きい場合にエラーハンドラーを実行します。

## Import

```ts
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
```

## 使い方

```ts
const app = new Hono()

app.post(
  '/upload',
  bodyLimit({
    maxSize: 50 * 1024, // 50kb
    onError: (c) => {
      return c.text('overflow :(', 413)
    },
  }),
  async (c) => {
    const body = await c.req.parseBody()
    if (body['file'] instanceof File) {
      console.log(`Got file sized: ${body['file'].size}`)
    }
    return c.text('pass :)')
  }
)
```

## オプション

### <Badge type="danger" text="required" /> maxSize: `number`

制限したいファイルの最大ファイルサイズです。 デフォルトは `100 * 1024` - `100kb` です。

### <Badge type="info" text="optional" /> onError: `OnError`

指定されたファイルサイズを超えた場合に呼び出されるエラーハンドラーです。

## Bun での大きなリクエストの扱い

Body Limit ミドルウェアを、デフォルトよりも大きいリクエストボディを許可するために明示的に使用する場合、それに応じて `Bun.serve` の設定を変更する必要があるかもしれません。 [執筆時点](https://github.com/oven-sh/bun/blob/f2cfa15e4ef9d730fc6842ad8b79fb7ab4c71cb9/packages/bun-types/bun.d.ts#L2191) では、 `Bun.serve` のデフォルトのリクエストボディ上限は 128MiB です。 Hono の Body Limit ミドルウェアにそれより大きい値を設定しても、リクエストは失敗し続け、さらにミドルウェアで指定された `onError` ハンドラーも呼び出されません。 これは、 `Bun.serve()` がステータスコードを `413` に設定し、リクエストを Hono に渡す前に接続を切断するためです。

Hono と Bun で 128MiB より大きいリクエストを受け付けたい場合は、 Bun 側にも上限を設定する必要があります:

```ts
export default {
  port: process.env['PORT'] || 3000,
  fetch: app.fetch,
  maxRequestBodySize: 1024 * 1024 * 200, // your value here
}
```

または、セットアップによっては次のようになります:

```ts
Bun.serve({
  fetch(req, server) {
    return app.fetch(req, { ip: server.requestIP(req) })
  },
  maxRequestBodySize: 1024 * 1024 * 200, // your value here
})
```
