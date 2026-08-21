# JWK Auth ミドルウェア

JWK Auth Middleware は、 JWK (JSON Web Key) を使ってトークンを検証することでリクエストを認証します。 `Authorization` ヘッダーと、指定された場合はクッキーなどの他の設定されたソースをチェックします。 提供された `keys` を使用してトークンを検証し、指定された場合は `jwks_uri` からキーを取得し、 `cookie` オプションが設定されている場合はクッキーからのトークン抽出をサポートします。

## このミドルウェアが検証すること

各トークンについて、 `jwk()` は次を行います:

- JWT ヘッダーの形式をパースして検証します。
- `kid` ヘッダーを要求し、 `kid` によってマッチするキーを探します。
- 対称アルゴリズム (`HS256` 、 `HS384` 、 `HS512`) を拒否します。
- ヘッダーの `alg` が設定された `alg` 許可リストに含まれていることを要求します。
- マッチした JWK に `alg` フィールドがある場合、それが JWT ヘッダーの `alg` と一致することを要求します。
- マッチしたキーでトークンの署名を検証します。
- デフォルトでは、時刻ベースのクレームである `nbf` 、 `exp` 、 `iat` を検証します。

オプションのクレーム検証は、 `verification` オプションで設定できます:

- `iss`: 指定された場合に issuer を検証します。
- `aud`: 指定された場合にオーディエンスを検証します。

上記以外の追加のトークンチェックが必要な場合 (例えば、カスタムのアプリケーションレベルの認可ルールなど) は、 `jwk()` の後に自分のミドルウェアで追加してください。

:::info
クライアントから送信される Authorization ヘッダーには、指定されたスキームが必要です。

例: `Bearer my.token.value` または `Basic my.token.value`
:::

## Import

```ts
import { Hono } from 'hono'
import { jwk } from 'hono/jwk'
import { verifyWithJwks } from 'hono/jwt'
```

## 使い方

```ts
const app = new Hono()

app.use(
  '/auth/*',
  jwk({
    jwks_uri: `https://${backendServer}/.well-known/jwks.json`,
    alg: ['RS256'],
  })
)

app.get('/auth/page', (c) => {
  return c.text('You are authorized')
})
```

ペイロードの取得:

```ts
const app = new Hono()

app.use(
  '/auth/*',
  jwk({
    jwks_uri: `https://${backendServer}/.well-known/jwks.json`,
    alg: ['RS256'],
  })
)

app.get('/auth/page', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload) // eg: { "sub": "1234567890", "name": "John Doe", "iat": 1516239022 }
})
```

匿名アクセス:

```ts
const app = new Hono()

app.use(
  '/auth/*',
  jwk({
    jwks_uri: (c) =>
      `https://${c.env.authServer}/.well-known/jwks.json`,
    alg: ['RS256'],
    allow_anon: true,
  })
)

app.get('/auth/page', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload ?? { message: 'hello anon' })
})
```

## ミドルウェア外での `verifyWithJwks` の使用

`verifyWithJwks` ユーティリティ関数は、 SvelteKit の SSR ページなどの Hono のミドルウェアコンテキスト外のサーバーサイド環境で JWT トークンを検証するために使用できます:

```ts
const id_payload = await verifyWithJwks(
  id_token,
  {
    jwks_uri: 'https://your-auth-server/.well-known/jwks.json',
    allowedAlgorithms: ['RS256'],
  },
  {
    cf: { cacheEverything: true, cacheTtl: 3600 },
  }
)
```

## JWKS 取得リクエストオプションの設定

`jwks_uri` から JWKS を取得する方法を設定するには、 `jwk()` の第2引数として fetch リクエストオプションを渡します。

この引数は `RequestInit` であり、 JWKS の fetch リクエストにのみ使用されます。

```ts
const app = new Hono()

app.use(
  '/auth/*',
  jwk(
    {
      jwks_uri: `https://${backendServer}/.well-known/jwks.json`,
      alg: ['RS256'],
    },
    {
      headers: {
        Authorization: 'Bearer TOKEN',
      },
    }
  )
)
```

## オプション

### <Badge type="danger" text="required" /> alg: `AsymmetricAlgorithm[]`

トークン検証に使用される許可された非対称アルゴリズムの配列です。

利用可能な型は `RS256` | `RS384` | `RS512` | `PS256` | `PS384` | `PS512` | `ES256` | `ES384` | `ES512` | `EdDSA` です。

### <Badge type="info" text="optional" /> keys: `HonoJsonWebKey[] | (c: Context) => Promise<HonoJsonWebKey[]>`

公開鍵の値、またはそれらを返す関数です。 関数は Context オブジェクトを受け取ります。

### <Badge type="info" text="optional" /> jwks_uri: `string` | `(c: Context) => Promise<string>`

この値が設定されている場合、この URI から JWK の取得を試みます。 `keys` を含む JSON レスポンスを期待し、取得したキーは提供された `keys` オプションに追加されます。 Context を使用して JWKS URI を動的に決定するコールバック関数を渡すこともできます。

### <Badge type="info" text="optional" /> allow_anon: `boolean`

この値が `true` に設定されている場合、有効なトークンを持たないリクエストもミドルウェアを通過できるようになります。 リクエストが認証されているかどうかを確認するには `c.get('jwtPayload')` を使用してください。 デフォルトは `false` です。

### <Badge type="info" text="optional" /> cookie: `string`

この値が設定されている場合、その値をキーとしてクッキーヘッダーから値が取得され、トークンとして検証されます。

### <Badge type="info" text="optional" /> headerName: `string`

JWT トークンを探すヘッダーの名前です。 デフォルトは `Authorization` です。

### <Badge type="info" text="optional" /> realm: `string`

`401` レスポンスで返される `WWW-Authenticate` チャレンジヘッダーの `realm` パラメータによって記述される保護空間です。 デフォルトはリクエスト URL です。

### <Badge type="info" text="optional" /> verification: `VerifyOptions`

署名検証に加えて、クレーム検証の挙動を設定します:

[Keep in sync with jwt.md]: #

#### <Badge type="info" text="optional" /> VerifyOptions.iss: `string | RegExp`

トークン検証に使用される期待される issuer です。 これが設定されていない場合、 `iss` クレームはチェック**されません**。

#### <Badge type="info" text="optional" /> VerifyOptions.aud: `string | string[] | RegExp`

トークン検証に使用される期待されるオーディエンスです。 これが設定されている場合、トークンは `aud` クレームを含んでいなければならず、少なくとも1つのオーディエンス値が一致する必要があります。

#### <Badge type="info" text="optional" /> VerifyOptions.nbf: `boolean`

`nbf` (not before) クレームは、存在し、かつこれが `true` に設定されている場合に検証されます。 デフォルトは `true` です。

#### <Badge type="info" text="optional" /> VerifyOptions.iat: `boolean`

`iat` (issued at) クレームは、存在し、かつこれが `true` に設定されている場合に検証されます。 デフォルトは `true` です。

#### <Badge type="info" text="optional" /> VerifyOptions.exp: `boolean`

`exp` (expiration time) クレームは、存在し、かつこれが `true` に設定されている場合に検証されます。 デフォルトは `true` です。
