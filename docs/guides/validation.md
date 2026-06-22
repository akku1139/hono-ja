# バリデーション

Hono はとても軽量なバリデータだけを提供しています。
しかしながら、サードパーティのバリデータを組み合わせると強力になります。
さらに、RPC 機能を使うと、型を通してクライアントと API の仕様を共有することができます。

## Manual validator

はじめに、サードパーティのバリデータを使用せずに、受信した値をバリデートする方法を紹介します。

`hono/validator` から `validator` をインポートします。

```ts
import { validator } from 'hono/validator'
```

フォームデータをバリデータするためには、第 1 引数に `form` を、第 2 引数にコールバックを指定します。
コールバック内の処理では、値をバリデートし、最後にバリデートされた値を返します。
`validator` をミドルウェアとして使用することができます。

```ts
app.post(
  '/posts',
  validator('form', (value, c) => {
    const body = value['body']
    if (!body || typeof body !== 'string') {
      return c.text('Invalid!', 400)
    }
    return {
      body: body,
    }
  }),
  //...
```

ハンドラ内では、`c.req.valid('form')` を使用してバリデートされた値を取得できます。

```ts
, (c) => {
  const { body } = c.req.valid('form')
  // 何か処理をする...
  return c.json(
    {
      message: 'Created!',
    },
    201
  )
}
```

バリデーションの対象としては、`form` だけでなく、`json`, `query`, `header`, `param` , `cookie` などがあります。

::: warning
`json` または `form` をバリデートする際に、リクエストはマッチする `content-type` ヘッダを含んでいる _必要があります_。（例．`json` の場合は、`Content-Type: application/json`）
もしそうでない場合、リクエストボディはパースされず、コールバック内で値として空のオブジェクト(`{}`)を受け取るでしょう。

[`app.request()`](../api/request.md) を使用してテストをする際に、`content-type` をセットすることは重要です。

アプリケーションは以下のようになります。

```ts
const app = new Hono()
app.post(
  '/testing',
  validator('json', (value, c) => {
    // 何もせずそのまま受け渡すバリデータ
    return value
  }),
  (c) => {
    const body = c.req.valid('json')
    return c.json(body)
  }
)
```

テストは以下のように記述できます。

```ts
// ❌ これは動作しません
const res = await app.request('/testing', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
})
const data = await res.json()
console.log(data) // {}

// ✅ これは動作します
const res = await app.request('/testing', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
  headers: new Headers({ 'Content-Type': 'application/json' }),
})
const data = await res.json()
console.log(data) // { key: 'value' }
```

:::

::: warning
`header` をバリデートする際、キーは **小文字** で指定する必要があります。

`Idempotency-Key` ヘッダをバリデートしたい場合、キーは `idempotency-key` のように指定する必要があります。

```ts
// ❌ これは動作しません
app.post(
  '/api',
  validator('header', (value, c) => {
    // idempotencyKey は常に undefined
    // そのためこのミドルウェアは常に not expected として 400 を返す
    const idempotencyKey = value['Idempotency-Key']

    if (idempotencyKey == undefined || idempotencyKey === '') {
      throw new HTTPException(400, {
        message: 'Idempotency-Key is required',
      })
    }
    return { idempotencyKey }
  }),
  (c) => {
    const { idempotencyKey } = c.req.valid('header')
    // ...
  }
)

// ✅ これは動作します
app.post(
  '/api',
  validator('header', (value, c) => {
    // 期待通りにヘッダの値を取得できる
    const idempotencyKey = value['idempotency-key']

    if (idempotencyKey == undefined || idempotencyKey === '') {
      throw new HTTPException(400, {
        message: 'Idempotency-Key is required',
      })
    }
    return { idempotencyKey }
  }),
  (c) => {
    const { idempotencyKey } = c.req.valid('header')
    // ...
  }
)
```

:::

## Multiple validators

リクエストの異なる箇所をバリデートするために、複数のバリデータを指定することができます:

```ts
app.post(
  '/posts/:id',
  validator('param', ...),
  validator('query', ...),
  validator('json', ...),
  (c) => {
    //...
  }
```

## Zod を使う

サードパーティのバリデータの１つとして [Zod](https://zod.dev) を使用できます。
サードパーティのバリデータを使用することを推奨します。

Npm レジストリからインストールします。

::: code-group

```sh [npm]
npm i zod
```

```sh [yarn]
yarn add zod
```

```sh [pnpm]
pnpm add zod
```

```sh [bun]
bun add zod
```

:::

`zod` から `z` をインポートします

```ts
import * as z from 'zod'
```

スキーマを記述します。

```ts
const schema = z.object({
  body: z.string(),
})
```

バリデーションのコールバック関数内でスキーマを使用し、バリデートした値を返すことができます。

```ts
const route = app.post(
  '/posts',
  validator('form', (value, c) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      return c.text('Invalid!', 401)
    }
    return parsed.data
  }),
  (c) => {
    const { body } = c.req.valid('form')
    // なにか処理をする...
    return c.json(
      {
        message: 'Created!',
      },
      201
    )
  }
)
```

## Zod Validator ミドルウェア

[Zod Validator ミドルウェア](https://github.com/honojs/middleware/tree/main/packages/zod-validator) を使用してより簡単に扱うことができます。

::: code-group

```sh [npm]
npm i @hono/zod-validator
```

```sh [yarn]
yarn add @hono/zod-validator
```

```sh [pnpm]
pnpm add @hono/zod-validator
```

```sh [bun]
bun add @hono/zod-validator
```

:::

`zValidator` をインポートします。

```ts
import { zValidator } from '@hono/zod-validator'
```

以下のように記述します。

```ts
const route = app.post(
  '/posts',
  zValidator(
    'form',
    z.object({
      body: z.string(),
    })
  ),
  (c) => {
    const validated = c.req.valid('form')
    // ... use your validated data
  }
)
```

## Standard Schema Validator ミドルウェア

[Standard Schema](https://standardschema.dev/) は、TypeScript のバリデーションライブラリの共通のインタフェースを提供する特徴があります。
Zod, Valibot, ArkType のメンテナによって作成されており、エコシステムツールが独自のアダプタを必要とせず、どんなバリデーションライブラリでも動作するようになっています。

Hono では、[Standard Schema Validator ミドルウェア](https://github.com/honojs/middleware/tree/main/packages/standard-validator) が Standard Schema 互換のバリデーションライブラリを使用することを強制します。

::: code-group

```sh [npm]
npm i @hono/standard-validator
```

```sh [yarn]
yarn add @hono/standard-validator
```

```sh [pnpm]
pnpm add @hono/standard-validator
```

```sh [bun]
bun add @hono/standard-validator
```

:::

パッケージから `sValidator` をインポートします:

```ts
import { sValidator } from '@hono/standard-validator'
```

### Zod を使う

Standard Schema バリデータとして Zod を使用できます:

::: code-group

```sh [npm]
npm i zod
```

```sh [yarn]
yarn add zod
```

```sh [pnpm]
pnpm add zod
```

```sh [bun]
bun add zod
```

:::

```ts
import * as z from 'zod'
import { sValidator } from '@hono/standard-validator'

const schema = z.object({
  name: z.string(),
  age: z.number(),
})

app.post('/author', sValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```

### Valibot を使う

[Valibot](https://valibot.dev/) is a lightweight alternative to Zod with a modular design:
[Valibot](https://valibot.dev/) は、モジュール形式の Zod に対する軽量な別の選択肢です。

::: code-group

```sh [npm]
npm i valibot
```

```sh [yarn]
yarn add valibot
```

```sh [pnpm]
pnpm add valibot
```

```sh [bun]
bun add valibot
```

:::

```ts
import * as v from 'valibot'
import { sValidator } from '@hono/standard-validator'

const schema = v.object({
  name: v.string(),
  age: v.number(),
})

app.post('/author', sValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```

### ArkType を使う

[ArkType](https://arktype.io/) は、ランタイムのバリデーションに対して TypeScript ネイティブな構文を提供します。

::: code-group

```sh [npm]
npm i arktype
```

```sh [yarn]
yarn add arktype
```

```sh [pnpm]
pnpm add arktype
```

```sh [bun]
bun add arktype
```

:::

```ts
import { type } from 'arktype'
import { sValidator } from '@hono/standard-validator'

const schema = type({
  name: 'string',
  age: 'number',
})

app.post('/author', sValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```
