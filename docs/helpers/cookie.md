# Cookie ヘルパー

Cookie Helper は、クッキーを管理するための簡単なインターフェースを提供し、開発者がクッキーの設定、パース、削除をシームレスに行えるようにします。

## Import

```ts
import { Hono } from 'hono'
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  generateCookie,
  generateSignedCookie,
} from 'hono/cookie'
```

## 使い方

### 通常のクッキー

```ts
app.get('/cookie', (c) => {
  setCookie(c, 'cookie_name', 'cookie_value')
  const yummyCookie = getCookie(c, 'cookie_name')
  deleteCookie(c, 'cookie_name')
  const allCookies = getCookie(c)
  // ...
})
```

### 署名付きクッキー

**NOTE**: 署名付きクッキーの設定と取得は Promise を返します。 これは、 HMAC SHA-256 署名の作成に使用される WebCrypto API が非同期であるためです。

```ts
app.get('/signed-cookie', (c) => {
  const secret = 'secret' // make sure it's a large enough string to be secure

  await setSignedCookie(c, 'cookie_name0', 'cookie_value', secret)
  const fortuneCookie = await getSignedCookie(
    c,
    secret,
    'cookie_name0'
  )
  deleteCookie(c, 'cookie_name0')
  // `getSignedCookie` will return `false` for a specified cookie if its signature fails verification
  const allSignedCookies = await getSignedCookie(c, secret)
  // ...
})
```

> [!NOTE]
> `getSignedCookie` は2つの場合を区別します。 署名はあるものの検証に失敗したクッキーは `false` を返します。 有効な署名形式を持たないクッキーは、そもそも署名付きクッキーとして扱われず、クッキーが存在しない場合と同様に `undefined` を返します。 このルールは、名前を指定して単一のクッキーを取得する場合も、すべての署名付きクッキーを取得する場合も適用されます。 `false` と `undefined` はどちらも falsy なので、 `if (!value)` で両方の場合を処理できます。

### クッキーの生成

`generateCookie` と `generateSignedCookie` 関数を使うと、レスポンスヘッダーに設定することなく、クッキー文字列を直接作成できます。

#### `generateCookie`

```ts
// Basic cookie generation
const cookie = generateCookie('delicious_cookie', 'macha')
// Returns: 'delicious_cookie=macha; Path=/'

// Cookie with options
const cookie = generateCookie('delicious_cookie', 'macha', {
  path: '/',
  secure: true,
  httpOnly: true,
  domain: 'example.com',
})
```

#### `generateSignedCookie`

```ts
// Basic signed cookie generation
const signedCookie = await generateSignedCookie(
  'delicious_cookie',
  'macha',
  'secret chocolate chips'
)

// Signed cookie with options
const signedCookie = await generateSignedCookie(
  'delicious_cookie',
  'macha',
  'secret chocolate chips',
  {
    path: '/',
    secure: true,
    httpOnly: true,
  }
)
```

**Note**: `setCookie` や `setSignedCookie` とは異なり、これらの関数はクッキー文字列を生成するだけです。 必要に応じて、手動でヘッダーに設定する必要があります。

## オプション

### `setCookie` & `setSignedCookie`

- domain: `string`
- expires: `Date`
- httpOnly: `boolean`
- maxAge: `number`
- path: `string`
- secure: `boolean`
- sameSite: `'Strict'` | `'Lax'` | `'None'`
- priority: `'Low' | 'Medium' | 'High'`
- prefix: `secure` | `'host'`
- partitioned: `boolean`

例:

```ts
// Regular cookies
setCookie(c, 'great_cookie', 'banana', {
  path: '/',
  secure: true,
  domain: 'example.com',
  httpOnly: true,
  maxAge: 1000,
  expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
  sameSite: 'Strict',
})

// Signed cookies
await setSignedCookie(
  c,
  'fortune_cookie',
  'lots-of-money',
  'secret ingredient',
  {
    path: '/',
    secure: true,
    domain: 'example.com',
    httpOnly: true,
    maxAge: 1000,
    expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
    sameSite: 'Strict',
  }
)
```

### `deleteCookie`

- path: `string`
- secure: `boolean`
- domain: `string`

例:

```ts
deleteCookie(c, 'banana', {
  path: '/',
  secure: true,
  domain: 'example.com',
})
```

`deleteCookie` は削除された値を返します:

```ts
const deletedCookie = deleteCookie(c, 'delicious_cookie')
```

## `__Secure-` と `__Host-` プレフィックス

Cookie Helper は、クッキー名に対する `__Secure-` と `__Host-` プレフィックスをサポートしています。

クッキー名がプレフィックスを持つか検証したい場合は、 prefix オプションを指定してください。

```ts
const securePrefixCookie = getCookie(c, 'yummy_cookie', 'secure')
const hostPrefixCookie = getCookie(c, 'yummy_cookie', 'host')

const securePrefixSignedCookie = await getSignedCookie(
  c,
  secret,
  'fortune_cookie',
  'secure'
)
const hostPrefixSignedCookie = await getSignedCookie(
  c,
  secret,
  'fortune_cookie',
  'host'
)
```

また、クッキーを設定する際にプレフィックスを指定したい場合は、 prefix オプションに値を指定してください。

```ts
setCookie(c, 'delicious_cookie', 'macha', {
  prefix: 'secure', // or `host`
})

await setSignedCookie(
  c,
  'delicious_cookie',
  'macha',
  'secret choco chips',
  {
    prefix: 'secure', // or `host`
  }
)
```

## ベストプラクティスへの準拠

新しい Cookie RFC (いわゆる cookie-bis) と CHIPS には、開発者が従うべきクッキー設定のベストプラクティスがいくつか含まれています。

- [RFC6265bis-13](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13)
  - `Max-Age`/`Expires` の制限
  - `__Host-`/`__Secure-` プレフィックスの制限
- [CHIPS-01](https://www.ietf.org/archive/id/draft-cutler-httpbis-partitioned-cookies-01.html)
  - `Partitioned` の制限

Hono はこれらのベストプラクティスに従っています。
Cookie Helper は、以下の条件でクッキーをパースする際に `Error` をスローします:

- クッキー名が `__Secure-` で始まるが、 `secure` オプションが設定されていない。
- クッキー名が `__Host-` で始まるが、 `secure` オプションが設定されていない。
- クッキー名が `__Host-` で始まるが、 `path` が `/` ではない。
- クッキー名が `__Host-` で始まるが、 `domain` が設定されている。
- `maxAge` オプションの値が400日より大きい。
- `expires` オプションの値が現在時刻より400日後である。
