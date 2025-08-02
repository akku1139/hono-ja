# Vercel

Vercel is the AI cloud, providing the developer tools and cloud infrastructure to build, scale, and secure a faster, more personalized web.

Hono can be deployed to Vercel with zero-configuration.

## 1. セットアップ

Vercel 向けのスターターもあります。
"create-hono" コマンドで始めましょう。
`vercel` テンプレートを選択します。

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

`my-app` に移動し、依存関係をインストールします。

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

We will use Vercel CLI to work on the app locally in the next step. If you haven't already, install it globally following [the Vercel CLI documentation](https://vercel.com/docs/cli).

## 2. Hello World

<<<<<<< HEAD
App Router を使用している場合 `app/api/[[...route]]/route.ts` に書いてください。 [Supported HTTP Methods](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#supported-http-methods) も参照してください。
=======
In the `index.ts` or `src/index.ts` of your project, export the Hono application as a default export.
>>>>>>> origin/sync

```ts
import { Hono } from 'hono'

const app = new Hono()

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/hono',
]

app.get('/', (c) => {
  return c.text(welcomeStrings.join('\n\n'))
})

export default app
```

<<<<<<< HEAD
Pages Router を使用している場合は `pages/api/[[...route]].ts` に記述します。

```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import type { PageConfig } from 'next'

export const config: PageConfig = {
  runtime: 'edge',
}

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello Next.js!',
  })
})

export default handle(app)
```

## 3. Run

開発サーバーをローカルで動かし、ブラウザで `http://localhost:3000` にアクセスしましょう。
=======
If you started with the `vercel` template, this is already set up for you.

## 3. Run

To run the development server locally:
>>>>>>> origin/sync

```sh
vercel dev
```

<<<<<<< HEAD
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

今は `/api/hello` で JSON を返すだけですが、 React で UI を作成すれば Hono でフルスタックアプリケーションを作成できます。
=======
Visiting `localhost:3000` will respond with a text response.
>>>>>>> origin/sync

## 4. デプロイ

<<<<<<< HEAD
Vercel アカウントを持っている場合は Git 連携でデプロイ出来ます。

## Node.js

Node.js ランタイム上の Next.js で Hono を使うことも出来ます。

### App Router

App Router では、ルートハンドラのランタイムを `nodejs` に設定するだけで使用できます:

```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

export const runtime = 'nodejs'

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
  })
})

export const GET = handle(app)
export const POST = handle(app)
=======
Deploy to Vercel using `vc deploy`.

```sh
vercel deploy
>>>>>>> origin/sync
```

## Further reading

<<<<<<< HEAD
Pages Router では、まず Node.js アダプタをインストールする必要があります:

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

次に、 `@hono/node-server/vercel` からインポートした `handle` を使用します:

```ts
import { Hono } from 'hono'
import { handle } from '@hono/node-server/vercel'
import type { PageConfig } from 'next'

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
}

const app = new Hono().basePath('/api')

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
  })
})

export default handle(app)
```

これを Pages Router で動かすためには、プロジェクトダッシュボードか `.env` ファイルで環境変数を設定して Vercel の Node.js ヘルパーを無効化することが重要です:

```text
NODEJS_HELPERS=0
```
=======
[Learn more about Hono in the Vercel documentation](https://vercel.com/docs/frameworks/hono).
>>>>>>> origin/sync
