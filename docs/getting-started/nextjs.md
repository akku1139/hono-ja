# Next.js

Next.js は、フレキシブルな React フレームワークで、高速なWebアプリケーションを構築するための構成要素を提供します。

Node.js ランタイムを使用している場合、 Next.js 上で Hono を実行することができます \
Vercel 上では、 Vercel 関数を使用することで Next.js と一緒に Hono をデプロイすることが簡単にできます。

## 1. セットアップ

Next.js 用のスターターが使用可能です。
"create-hono" コマンドでプロジェクトを開始します。
この例では、 `nextjs` テンプレートを選択します。

::: code-group

```sh [npm]
npm create hono@latest my-app
```

```sh [yarn]
yarn create hono my-app
```

```sh [pnpm]
pnpm create hono my-app
```

```sh [bun]
bun create hono@latest my-app
```

```sh [deno]
deno init --npm hono my-app
```

:::

`my-app` フォルダに移動し、依存関係をインストールします。

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

## 2. Hello World

App ルータを使用している場合、 `app/api/[[...route]]/route.ts` を編集します。他のオプションについては、[Supported HTTP Methods](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#supported-http-methods) セクションを参照してください。

```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello Next.js!',
  })
})

export const GET = handle(app)
export const POST = handle(app)
```

## 3. Run

ローカルで開発サーバを実行し、ウェブブラウザで `http://localhost:3000` にアクセスします。

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

`/api/hello` にアクセスすると、 JSON を返します。しかし、 React UI を構築している場合、 Hono でフルスタックアプリケーションを作成することができます。

## 4. デプロイ

Vercel のアカウントがある場合、 Git リポジトリをリンクすることでデプロイすることができます。

## Pages Router

Pages ルータを使用している場合、まず Node.js アダプタをインストールする必要があります。

::: code-group

```sh [npm]
npm i @hono/node-server
```

```sh [yarn]
yarn add @hono/node-server
```

```sh [pnpm]
pnpm add @hono/node-server
```

```sh [bun]
bun add @hono/node-server
```

:::

`pages/api/[[...route]].ts` 内で `@hono/node-server` からインポートした `getRequestListener` 関数を利用することができます。

```ts
import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import type { PageConfig } from 'next'

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
}

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello Next.js!',
  })
})

export default getRequestListener(app.fetch)
```

Pages ルータを動作させるには、 プロジェクトのダッシュボードの環境変数か `.env` ファイルで Vercel Node.js ヘルパーを無効に設定することが重要です。

```text
NODEJS_HELPERS=0
```
