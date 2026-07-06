# Fastly Compute

[Fastly Compute](https://www.fastly.com/products/edge-compute) は好きな言語で書かれたコードをグローバルネットワーク上で実行できる高度なエッジコンピューティングシステムです。 Hono はもちろん Fastly Compute 上でも動作します。

[Fastly CLI](https://www.fastly.com/documentation/reference/tools/cli/) を使用すると、少しのコマンドでアプリケーションをローカルで開発して、公開できます。

## 1. Setup

スターターは Fastly Compute でも使用できます。
"create-hono" コマンドでプロジェクトを開始しましょう。
`fastly` テンプレートを選択します。

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

`my-app` に移動して依存関係をインストールします。

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

`src/index.ts` を変更します:

```ts
// src/index.ts
import { Hono } from 'hono'
import { fire } from '@fastly/hono-fastly-compute'

const app = new Hono()

app.get('/', (c) => c.text('Hello Fastly!'))

fire(app)
```

> [!NOTE]
> アプリケーションのトップレベルで、 `@fastly/hono-fastly-compute'` から `fire` (または `buildFire()`) を使用する際に、 `'hono/quick'` よりはむしろ `'hono'` から `Hono` を使用する方が適切です。`fire` を使用すると、アプリケーションの初期化段階でルータが内部データを構築してしまうためです。

## 3. Run

ローカルで開発サーバーを起動し、ブラウザで `http://localhost:7676` にアクセスしてください。

::: code-group

```sh [npm]
npm run start
```

```sh [yarn]
yarn start
```

```sh [pnpm]
pnpm run start
```

```sh [bun]
bun run start
```

:::

## 4. デプロイ

ビルドして、あなたの Fastly アカウントにデプロイするには以下のコマンドを実行します。 あなたがアプリケーションを始めてデプロイする場合、アカウントに新しいサービスを作成するように求められます。

まだアカウントを持っていない場合は、[作成する必要があります](https://www.fastly.com/signup/)。

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

Fastly Computeでは、高速なプラットフォームリソースをバインドすることができます。たとえば、KV ストア, Config ストア, Secret ストア, バックエンド, アクセス制御リスト, 名前付きログストリーム, 環境変数 などです。 `c.env` を通してアクセスすることができ、個々の SDK の型があります。

これらのバインディングを使用するには、 `@fastly/hono-fastly-compute` から `fire` の代わりに `buildFire` を import します。[bindings](https://github.com/fastly/compute-js-context?tab=readme-ov-file#typed-bindings-with-buildcontextproxy) を定義して、 [`buildFire()`](https://github.com/fastly/hono-fastly-compute?tab=readme-ov-file#basic-example) に渡して `fire`を取得します。 `Hono` を構築する際に、 `Env` 型を定義するために `fire.Bindings` を使用してください。

```ts
// src/index.ts
import { buildFire } from '@fastly/hono-fastly-compute'

const fire = buildFire({
  siteData: 'KVStore:site-data', // "site-data" という名前の KV ストアがあります
})

const app = new Hono<{ Bindings: typeof fire.Bindings }>()

app.put('/upload/:key', async (c, next) => {
  // 例. KV ストア にアクセスします
  const key = c.req.param('key')
  await c.env.siteData.put(key, c.req.body)
  return c.text(`Put ${key} successfully!`)
})

fire(app)
```
