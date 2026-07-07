# Cloudflare Workers + Vite

[`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/vite-plugin/) を使用して、 [Vite](https://vite.dev) と共に [Cloudflare Workers](https://workers.cloudflare.com) 上にフルスタックアプリケーションを構築することができます。
このセットアップは、高速な Vite 開発サーバ、 Hono の JSX レンダラを使用したサーバサイドレンダリング、 Vite にバンドルされたクライアントサイドスクリプトなどを提供します - すべて Cloudflare Workers 上で動作します。

これは、 Cloudflare 上に新しいフルスタックプロジェクトを開始するために推奨されている方法です。

## 1. セットアップ

Vite を含んだ Cloudflare Workers 用のスターターが使用可能です。
"create-hono" コマンドを使って、プロジェクトを開始します。
この例では、 `cloudflare-workers+vite` を選択しています。

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

以下は基本的なディレクトリ構成です。

```text
./
├── package.json
├── public // Put your static files here.
├── src
│   ├── index.tsx // The entry point for server-side.
│   ├── renderer.tsx
│   └── style.css
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc
```

`vite.config.ts` は、 Cloudflare プラグインと SSR 用の `vite-ssr-components` を結合します:

```ts
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
})
```

## 2. Hello World

次のように `src/index.tsx` を編集します:

```tsx
import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello, Cloudflare Workers!</h1>)
})

export default app
```

`renderer` は、 `vite-ssr-components` といっしょに Hono の [JSX renderer ミドルウェア](/docs/middleware/builtin/jsx-renderer) を使用して `src/renderer.tsx` で定義されます。

```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Link href='/src/style.css' rel='stylesheet' />
      </head>
      <body>{children}</body>
    </html>
  )
})
```

## 3. 実行

開発サーバをローカルで実行します。 ウェブブラウザで `http://localhost:5173` にアクセスします。

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

## 4. デプロイ

Cloudflare アカウントを持っている場合、 Cloudflare にデプロイすることができます。 `deploy` スクリプトは、 Vite でビルドされ、 Wrangler で公開します。

::: code-group

```sh [npm]
npm run deploy
```

```sh [yarn]
yarn deploy
```

```sh [pnpm]
pnpm run deploy
```

```sh [bun]
bun run deploy
```

:::

## バインディング

Variables, KV, D1 などのような Cloudflare バインディングを使用することができます。
`wrangler.jsonc` で設定します。 たとえば、 `MY_NAME` という名前の変数を追加するには以下のようにします:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-app",
  "compatibility_date": "2025-08-03",
  "main": "./src/index.tsx",
  "vars": {
    "MY_NAME": "Hono",
  },
}
```

バインディング用に型を生成するために、 `cf-typegen` スクリプトを実行します:

::: code-group

```sh [npm]
npm run cf-typegen
```

```sh [yarn]
yarn cf-typegen
```

```sh [pnpm]
pnpm run cf-typegen
```

```sh [bun]
bun run cf-typegen
```

:::

`CloudflareBindings` が生成されるので、ジェネリクスとして `Hono` にそれを渡します:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

`c.env` を通してバインディングにアクセスします:

```tsx
app.get('/', (c) => {
  return c.render(<h1>Hello! {c.env.MY_NAME}</h1>)
})
```

## クライアントサイド

`vite-ssr-components` は、 Vite を通してクライアントサイドスクリプトをロードさせます。
クライアントのエントリポイントを示す `Script` コンポーネントを追加してください。 Vite は、 dev と production のどちらでもバンドルを処理します:

```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Script src='/src/client.ts' />
      </head>
      <body>{children}</body>
    </html>
  )
})
```

詳細については、 [`@cloudflare/vite-plugin` documentation](https://developers.cloudflare.com/workers/vite-plugin/) や [`vite-ssr-components`](https://github.com/yusukebe/vite-ssr-components) を参照してください。
