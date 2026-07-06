# Vercel

Vercel は、 AI クラウドであり、より高速でパーソナライズされたウェブを構築し、拡張し、安全にする開発ツールやクラウドインフラを提供しています。

Hono は設定なしで Vercel にデプロイすることができます。

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

次のステップでは、ローカル環境のアプリケーション上で動作する Vercel CLI を使用します。まだインストールされていない場合は、 [Vercel CLI ドキュメント](https://vercel.com/docs/cli) に従ってグローバルにインストールしてください。

## 2. Hello World

プロジェクトの `index.ts` あるいは `src/index.ts` 内で、 default export として Hono　アプリケーションをエクスポートします。

```ts
import { Hono } from 'hono'

const app = new Hono()

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono',
]

app.get('/', (c) => {
  return c.text(welcomeStrings.join('\n\n'))
})

export default app
```

`vercel` テンプレートを使用している場合は、すでにセットアップされています。

## 3. Run

ローカルで開発サーバを実行するには:

```sh
vercel dev
```

`localhost:3000` にアクセスするとテキストレスポンスを返します。

## 4. デプロイ

`vc deploy` を使用して Vercel にデプロイします。

```sh
vercel deploy
```

## 参考文献

[Vercel ドキュメントで Hono について学ぶ](https://vercel.com/docs/frameworks/backend/hono).
