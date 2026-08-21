# Bearer Auth ミドルウェア

Bearer Auth Middleware は、リクエストヘッダー内の API トークンを検証することで認証を提供します。
エンドポイントにアクセスする HTTP クライアントは、ヘッダー値として `Bearer {token}` を付けた `Authorization` ヘッダーを追加します。

ターミナルから `curl` を使用すると、次のようになります:

```sh
curl -H 'Authorization: Bearer honoiscool' http://localhost:8787/auth/page
```

## Import

```ts
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
```

## 使い方

> [!NOTE]
> `token` は正規表現 `/[A-Za-z0-9._~+/-]+=*/` にマッチする必要があります。 そうでない場合は 400 エラーが返されます。 特に、この正規表現は URL セーフ Base64 と標準 Base64 でエンコードされた JWT の両方に対応しています。 このミドルウェアは、ベアラートークンが JWT であることを要求せず、上記の正規表現にマッチすることのみを要求します。

```ts
const app = new Hono()

const token = 'honoiscool'

app.use('/api/*', bearerAuth({ token }))

app.get('/api/page', (c) => {
  return c.json({ message: 'You are authorized' })
})
```

特定のルート + メソッドに制限する場合:

```ts
const app = new Hono()

const token = 'honoiscool'

app.get('/api/page', (c) => {
  return c.json({ message: 'Read posts' })
})

app.post('/api/page', bearerAuth({ token }), (c) => {
  return c.json({ message: 'Created post!' }, 201)
})
```

複数のトークンを実装する場合 (例えば、任意の有効なトークンは読み取り可能だが、作成/更新/削除は特権トークンに制限される):

```ts
const app = new Hono()

const readToken = 'read'
const privilegedToken = 'read+write'
const privilegedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

app.on('GET', '/api/page/*', async (c, next) => {
  // List of valid tokens
  const bearer = bearerAuth({ token: [readToken, privilegedToken] })
  return bearer(c, next)
})
app.on(privilegedMethods, '/api/page/*', async (c, next) => {
  // Single valid privileged token
  const bearer = bearerAuth({ token: privilegedToken })
  return bearer(c, next)
})

// Define handlers for GET, POST, etc.
```

トークンの値を自分で検証したい場合は、 `verifyToken` オプションを指定してください。 `true` を返すと受け入れられたことを意味します。

```ts
const app = new Hono()

app.use(
  '/auth-verify-token/*',
  bearerAuth({
    verifyToken: async (token, c) => {
      return token === 'dynamic-token'
    },
  })
)
```

## オプション

### <Badge type="danger" text="required" /> token: `string` | `string[]`

受信したベアラートークンを検証するための文字列です。

### <Badge type="info" text="optional" /> realm: `string`

返される WWW-Authenticate チャレンジヘッダーの一部としてのレルムのドメイン名です。 デフォルトは `""` です。
詳しくは次を参照してください: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/WWW-Authenticate#directives

### <Badge type="info" text="optional" /> prefix: `string`

Authorization ヘッダー値のプレフィックス (`schema` とも呼ばれます) です。 デフォルトは `"Bearer"` です。

### <Badge type="info" text="optional" /> headerName: `string`

ヘッダー名です。 デフォルト値は `Authorization` です。

### <Badge type="info" text="optional" /> hashFunction: `Function`

認証トークンを安全に比較するためのハッシュ処理を行う関数です。

### <Badge type="info" text="optional" /> verifyToken: `(token: string, c: Context) => boolean | Promise<boolean>`

トークンを検証する関数です。

### <Badge type="info" text="optional" /> noAuthenticationHeader: `object`

リクエストに認証ヘッダーがない場合のエラーレスポンスをカスタマイズします。

- `wwwAuthenticateHeader`: `string | object | MessageFunction` - WWW-Authenticate ヘッダー値をカスタマイズします。
- `message`: `string | object | MessageFunction` - レスポンスボディのカスタムメッセージです。

`MessageFunction` は `(c: Context) => string | object | Promise<string | object>` です。

### <Badge type="info" text="optional" /> invalidAuthenticationHeader: `object`

認証ヘッダーの形式が無効な場合のエラーレスポンスをカスタマイズします。

- `wwwAuthenticateHeader`: `string | object | MessageFunction` - WWW-Authenticate ヘッダー値をカスタマイズします。
- `message`: `string | object | MessageFunction` - レスポンスボディのカスタムメッセージです。

### <Badge type="info" text="optional" /> invalidToken: `object`

トークンが無効な場合のエラーレスポンスをカスタマイズします。

- `wwwAuthenticateHeader`: `string | object | MessageFunction` - WWW-Authenticate ヘッダー値をカスタマイズします。
- `message`: `string | object | MessageFunction` - レスポンスボディのカスタムメッセージです。
