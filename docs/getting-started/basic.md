# 始めましょう!

Hono を使うのはとても簡単です。 プロジェクトを作成し、コードを書き、開発サーバーを立ち上げ、素早くデプロイ出来ます。 エントリポイントが違うだけの同じコードが全てのランタイムで動作します。 では基本的な Hono の使い方を見ていきましょう!

## スターター

それぞれのプラットフォームでスターターテンプレートが用意されており、 "create-hono" コマンドで使用できます。

::: code-group

```sh [npm]
npm create hono@latest my-app
```

```sh [yarn]
yarn create hono my-app
```

```sh [pnpm]
pnpm create hono@latest my-app
```

```sh [bun]
bun create hono@latest my-app
```

```sh [deno]
deno run -A npm:create-hono@latest my-app
```

:::

次にどのテンプレートを使用するか質問があります。
ここでは Cloudflare Workers 向けのサンプルを選びました。

```
? Which template do you want to use?
    aws-lambda
    bun
    cloudflare-pages
❯   cloudflare-workers
    deno
    fastly
    nextjs
    nodejs
    vercel
```

テンプレートが `my-app` に展開されたので依存関係をインストールします。

::: code-group

```sh [npm]
cd my-app
npm i
```

```sh [yarn]
cd my-app
yarn
```

```sh [pnpm]
cd my-app
pnpm i
```

```sh [bun]
cd my-app
bun i
```

:::

パッケージのインストールが完了したら、開発サーバーを起動してみましょう。

::: code-group

```sh [npm]
npm run dev
```

```sh [yarn]
yarn dev
```

```sh [pnpm]
pnpm dev
```

```sh [bun]
bun run dev
```

:::

## Hello World

Cloudflare Workers 開発ツールの "Wrangler" 、 Deno 、 Bun などを使用しトランスパイルを意識することなくコードを書けます。

`src/index.ts` に Hono を使用した最初のアプリケーションを作っていきます。 以下の例は Hono スターターアプリケーションです。

`import` と 最後の `export default` はランタイムによって違うことがあります。
しかし、全てのアプリケーションのコードはどこでも同じです。

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
```

開発サーバーを起動し、ブラウザで `http://localhost:8787` にアクセスします。

::: code-group

```sh [npm]
npm run dev
```

```sh [yarn]
yarn dev
```

```sh [pnpm]
pnpm dev
```

```sh [bun]
bun run dev
```

:::

## JSON を返す

JSON を返すのは非常に簡単です。 以下は `/api/hello` の GET リクエストを処理して `application/json` の Response を返す例です。

```ts
app.get('/api/hello', (c) => {
  return c.json({
    ok: true,
    message: 'Hello Hono!',
  })
})
```

## Request / Response

パスパラメータ、 URL クエリを取得し、レスポンスヘッダを追加する例です。

```ts
app.get('/posts/:id', (c) => {
  const page = c.req.query('page')
  const id = c.req.param('id')
  c.header('X-Message', 'Hi!')
  return c.text(`You want see ${page} of ${id}`)
})
```

GET のみならず POST 、 PUT 、 DELETE も簡単に処理できます。

```ts
app.post('/posts', (c) => c.text('Created!', 201))
app.delete('/posts/:id', (c) =>
  c.text(`${c.req.param('id')} is deleted!`)
)
```

## HTML を返す

You can write HTML with [the html Helper](/docs/helpers/html) or using [JSX](/docs/guides/jsx) syntax. If you want to use JSX, rename the file to `src/index.tsx` and configure it (check with each runtime as it is different). Below is an example using JSX.

```tsx
const View = () => {
  return (
    <html>
      <body>
        <h1>Hello Hono!</h1>
      </body>
    </html>
  )
}

app.get('/page', (c) => {
  return c.html(<View />)
})
```

## 生の Response を返す

生の [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) を返すことも出来ます。

```ts
app.get('/', (c) => {
  return new Response('Good morning!')
})
```

## ミドルウェアを使う

ミドルウェアが面倒な作業を肩代りしてくれます。
例えば、 Basic 認証を追加する例がこちらです。

```ts
import { basicAuth } from 'hono/basic-auth'

// ...

app.use(
  '/admin/*',
  basicAuth({
    username: 'admin',
    password: 'secret',
  })
)

app.get('/admin', (c) => {
  return c.text('You are authorized!')
})
```

Bearer や JWT 認証、 CORS や ETag などの便利なミドルウェアが含まれています。
また、 GraphQL サーバーや Firebase Auth などの外部ライブラリを使用したサードパーティのミドルウェアも提供します。
そして、ミドルウェアを作ることも出来ます。

## アダプタ

静的ファイルや WebSocket の処理など、プラットフォームによって異なる機能を実装するためのアダプタがあります。
例えば、 WebSocket を Cloudflare Workers で扱うためには `hono/cloudflare-workers` をインポートします

```ts
import { upgradeWebSocket } from 'hono/cloudflare-workers'

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    // ...
  })
)
```

## 次のステップ

ほとんどのコードはどのプラットフォームでも動きますが、それぞれのガイドがあります。
例えば、プロジェクトのセットアップ方法やデプロイ方法です。
アプリケーションの作成に使用したいプラットフォームを参照してください。
