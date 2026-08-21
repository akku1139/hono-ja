# Method Not Allowed ミドルウェア

Method Not Allowed ミドルウェアは、リクエストパスが登録済みのルートにマッチするが、リクエストメソッドがサポートされていない場合に、 `Allow` ヘッダー付きの `405 Method Not Allowed` レスポンスを返します。 このミドルウェアがない場合、 Hono はそのケースで `404 Not Found` を返します。

## Import

```ts
import { Hono } from 'hono'
import { methodNotAllowed } from 'hono/method-not-allowed'
```

## 使い方

```ts
const app = new Hono()

app.use(methodNotAllowed({ app }))

app.get('/hello', (c) => c.text('Hello!'))
app.post('/hello', (c) => c.text('Posted!'))

// PUT /hello -> 405 Method Not Allowed
// Allow: GET, HEAD, POST
```

`onMethodNotAllowed` オプションでレスポンスをカスタマイズできます:

```ts
app.use(
  methodNotAllowed({
    app,
    onMethodNotAllowed: (c, methods) =>
      c.json({ error: 'Method Not Allowed' }, 405, {
        Allow: methods.join(', '),
      }),
  })
)
```

## オプション

### <Badge type="danger" text="required" /> app: `Hono`

アプリケーションで使用される Hono のインスタンスです。 ミドルウェアは、登録されたルートから各パスに対して許可されたメソッドを収集します。

### <Badge type="info" text="optional" /> onMethodNotAllowed: `(c: Context, allowedMethods: string[]) => Response | Promise<Response>`

`Allow` ヘッダーを含むレスポンスを生成します。 デフォルトでは、ミドルウェアは許可されたメソッドが設定された `Allow` ヘッダー付きの `405 Method Not Allowed` レスポンスを返します。
