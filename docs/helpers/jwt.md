# JWT 認証ヘルパー

このヘルパーは、 JSON Web Token (JWT) のエンコード、デコード、署名、検証のための関数を提供します。 JWT は、 Web アプリケーションで認証や認可の目的で広く使われています。 このヘルパーは、様々な暗号化アルゴリズムをサポートする堅牢な JWT 機能を提供します。

## Import

このヘルパーを使用するには、次のようにインポートします:

```ts
import { decode, sign, verify } from 'hono/jwt'
```

::: info
[JWT ミドルウェア](/docs/middleware/builtin/jwt) も `hono/jwt` から `jwt` 関数をインポートします。
:::

## `sign()`

この関数は、ペイロードをエンコードし、指定されたアルゴリズムとシークレットで署名することで、 JWT トークンを生成します。

```ts
sign(
  payload: unknown,
  secret: string,
  alg?: 'HS256';

): Promise<string>;
```

### 例

```ts
import { sign } from 'hono/jwt'

const payload = {
  sub: 'user123',
  role: 'admin',
  exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
}
const secret = 'mySecretKey'
const token = await sign(payload, secret)
```

### オプション

<br/>

#### <Badge type="danger" text="required" /> payload: `unknown`

署名される JWT のペイロードです。 [ペイロードの検証](#payload-validation) にあるような他のクレームを含めることができます。

#### <Badge type="danger" text="required" /> secret: `string`

JWT の検証や署名に使用されるシークレットキーです。

#### <Badge type="info" text="optional" /> alg: [AlgorithmTypes](#supported-algorithmtypes)

JWT の署名や検証に使用されるアルゴリズムです。 デフォルトは HS256 です。

## `verify()`

この関数は、 JWT トークンが本物でまだ有効であるかを確認します。 トークンが改ざんされていないことを保証し、 [ペイロードの検証](#payload-validation) を追加した場合にのみ有効性をチェックします。

```ts
verify(
  token: string,
  secret: string,
  alg: 'HS256';
  issuer?: string | RegExp;
  aud?: string | string[] | RegExp;
): Promise<any>;

```

### 例

```ts
import { verify } from 'hono/jwt'

const tokenToVerify = 'token'
const secretKey = 'mySecretKey'

const decodedPayload = await verify(tokenToVerify, secretKey, 'HS256')
console.log(decodedPayload)
```

### オプション

<br/>

#### <Badge type="danger" text="required" /> token: `string`

検証対象の JWT トークンです。

#### <Badge type="danger" text="required" /> secret: `string`

JWT の検証や署名に使用されるシークレットキーです。

#### <Badge type="danger" text="required" /> alg: [AlgorithmTypes](#supported-algorithmtypes)

JWT の署名や検証に使用されるアルゴリズムです。

#### <Badge type="info" text="optional" /> issuer: `string | RegExp`

JWT の検証に使用される期待される issuer です。

#### <Badge type="info" text="optional" /> aud: `string | string[] | RegExp`

JWT の検証に使用される期待されるオーディエンスです。 これが設定されている場合、トークンは `aud` クレームを含んでいなければならず、少なくとも1つのオーディエンス値が一致する必要があります。

## `decode()`

この関数は、署名の検証を行わずに JWT トークンをデコードします。 トークンからヘッダーとペイロードを抽出して返します。

```ts
decode(token: string): { header: any; payload: any };
```

### 例

```ts
import { decode } from 'hono/jwt'

// Decode the JWT token
const tokenToDecode =
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJzdWIiOiAidXNlcjEyMyIsICJyb2xlIjogImFkbWluIn0.JxUwx6Ua1B0D1B0FtCrj72ok5cm1Pkmr_hL82sd7ELA'

const { header, payload } = decode(tokenToDecode)

console.log('Decoded Header:', header)
console.log('Decoded Payload:', payload)
```

### オプション

<br/>

#### <Badge type="danger" text="required" /> token: `string`

デコード対象の JWT トークンです。

> `decode` 関数を使うと、検証を行わ _**ずに**_ JWT トークンのヘッダーとペイロードを調査できます。 これは、デバッグや JWT トークンからの情報抽出に役立ちます。

## ペイロードの検証

JWT トークンの検証時には、以下のペイロード検証が行われます:

- `exp`: トークンの有効期限が切れていないかチェックされます。
- `nbf`: トークンが指定された時刻より前に使用されていないかチェックされます。
- `iat`: トークンが未来に発行されていないかチェックされます。
- `iss`: トークンが信頼できる issuer によって発行されたものかチェックされます。
- `aud`: `aud` 検証パラメータが設定されている場合、トークンが許可されたオーディエンス向けのものであるかチェックされます。

検証時にこれらのチェックを行いたい場合は、 JWT ペイロードにこれらのフィールドをオブジェクトとして含めてください。

## カスタムエラー型

このモジュールは、 JWT 関連のエラーを処理するためのカスタムエラー型も定義しています。

- `JwtAlgorithmNotImplemented`: リクエストされた JWT アルゴリズムが実装されていないことを示します。
- `JwtTokenInvalid`: JWT トークンが無効であることを示します。
- `JwtTokenNotBefore`: トークンが有効日より前に使用されていることを示します。
- `JwtTokenExpired`: トークンの有効期限が切れていることを示します。
- `JwtTokenIssuedAt`: トークン内の "iat" クレームが正しくないことを示します。
- `JwtTokenIssuer`: トークン内の "iss" クレームが正しくないことを示します。
- `JwtPayloadRequiresAud`: `aud` 検証が設定されている場合に `aud` クレームが必要であることを示します。
- `JwtTokenAudience`: トークンの `aud` クレームが期待されるオーディエンスと一致しないことを示します。
- `JwtTokenSignatureMismatched`: トークン内の署名の不一致を示します。

## サポートされている AlgorithmTypes

このモジュールは、以下の JWT 暗号化アルゴリズムをサポートしています:

- `HS256`: HMAC using SHA-256
- `HS384`: HMAC using SHA-384
- `HS512`: HMAC using SHA-512
- `RS256`: RSASSA-PKCS1-v1_5 using SHA-256
- `RS384`: RSASSA-PKCS1-v1_5 using SHA-384
- `RS512`: RSASSA-PKCS1-v1_5 using SHA-512
- `PS256`: RSASSA-PSS using SHA-256 and MGF1 with SHA-256
- `PS384`: RSASSA-PSS using SHA-386 and MGF1 with SHA-386
- `PS512`: RSASSA-PSS using SHA-512 and MGF1 with SHA-512
- `ES256`: ECDSA using P-256 and SHA-256
- `ES384`: ECDSA using P-384 and SHA-384
- `ES512`: ECDSA using P-521 and SHA-512
- `EdDSA`: EdDSA using Ed25519
