# アダプタヘルパー

Adapter Helper は、統一されたインターフェースを通じて様々なプラットフォームとシームレスにやり取りする方法を提供します。

## Import

```ts
import { Hono } from 'hono'
import { env, getRuntimeKey } from 'hono/adapter'
```

## `env()`

`env()` 関数は、 Cloudflare Workers の Bindings にとどまらず、異なるランタイム間で環境変数を取得することを容易にします。 `env(c)` で取得できる値は、ランタイムごとに異なる場合があります。

```ts
import { env } from 'hono/adapter'

app.get('/env', (c) => {
  // NAME is process.env.NAME on Node.js or Bun
  // NAME is the value written in `wrangler.toml` on Cloudflare
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})
```

サポートされているランタイム、サーバーレスプラットフォーム、クラウドサービス:

- Cloudflare Workers
  - `wrangler.toml`
  - `wrangler.jsonc`
- Deno
  - [`Deno.env`](https://docs.deno.com/runtime/manual/basics/env_variables)
  - `.env` ファイル
- Bun
  - [`Bun.env`](https://bun.com/guides/runtime/set-env)
  - `process.env`
- Node.js
  - `process.env`
- Vercel
  - [Environment Variables on Vercel](https://vercel.com/docs/projects/environment-variables)
- AWS Lambda
  - [Environment Variables on AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/samples-blank.html#samples-blank-architecture)
- Lambda@Edge\
  Lambda の環境変数は Lambda@Edge では [サポートされていません](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html) 。 代わりに [Lambda@Edge イベント](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html) を使用する必要があります。
- Fastly Compute\
  Fastly Compute では、 ConfigStore を使用してユーザー定義のデータを管理できます。
- Netlify\
  Netlify では、 [Netlify Contexts](https://docs.netlify.com/site-deploys/overview/#deploy-contexts) を使用してユーザー定義のデータを管理できます。

### ランタイムの指定

第2引数にランタイムキーを渡すことで、環境変数を取得するランタイムを指定できます。

```ts
app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c, 'workerd')
  return c.text(NAME)
})
```

## `getRuntimeKey()`

`getRuntimeKey()` 関数は、現在のランタイムの識別子を返します。

```ts
app.get('/', (c) => {
  if (getRuntimeKey() === 'workerd') {
    return c.text('You are on Cloudflare')
  } else if (getRuntimeKey() === 'bun') {
    return c.text('You are on Bun')
  }
  ...
})
```

### 利用可能なランタイムキー

以下は利用可能なランタイムキーの一覧です。 利用できないランタイムキーは、サポートされる可能性があり、 `other` というラベルが付けられます。 一部のキーは [WinterCG's Runtime Keys](https://runtime-keys.proposal.wintercg.org/) に着想を得ています:

- `workerd` - Cloudflare Workers
- `deno`
- `bun`
- `node`
- `edge-light` - Vercel Edge Functions
- `fastly` - Fastly Compute
- `other` - その他の未知のランタイムキー
