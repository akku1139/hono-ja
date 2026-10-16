# Tencent CloudBase

[Tencent CloudBase](https://docs.cloudbase.net/en/) はテンセントクラウドのサーバレスのバックエンドプラットフォームです。 [HTTP Cloud Functions](https://docs.cloudbase.net/en/cloud-function/develop/how-to-writing-functions-code) は、 プレーンな Node.js プロセスとして動作します。 アプリケーションは、 ポート `9000` で待ち受けし、 CloudBase は [`scf_bootstrap`](https://docs.cloudbase.net/en/cloud-function/develop/scf-bootstrap) を通じてアプリケーションを起動します。 [`@hono/node-server`](https://github.com/honojs/node-server) はそのまま動作します。 Hono のアダプタは必要ありません。

## 1. Setup

"create-hono" コマンドを使用してプロジェクトを開始します。 `nodejs` を選択します。

::: code-group

```sh [npm]
npm create hono@latest my-app
cd my-app
npm i
```

```sh [yarn]
yarn create hono my-app
cd my-app
yarn
```

```sh [pnpm]
pnpm create hono my-app
cd my-app
pnpm i
```

```sh [bun]
bun create hono@latest my-app
cd my-app
bun i
```

:::

## 2. Hello World

`src/index.ts` を編集します。 CloudBase HTTP Cloud Functions は、ポート `9000` を使用します。

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello CloudBase!'))

serve({
  fetch: app.fetch,
  port: 9000,
})
```

## 3. Run

```sh
npm run dev
```

それから `http://localhost:9000` にアクセスします。

## 4. Bootstrap

プロジェクトのルートに `scf_bootstrap` ファイル ( ファイルの拡張子なし ) を作成します。 それからファイルに実行権限を与えます:

```sh
#!/bin/bash
/var/lang/node20/bin/node dist/index.js
```

```sh
chmod +x scf_bootstrap
```

改行コードは LF を使用してください。 Node のパスは、関数のランタイムにマッチしなければなりません。 Node.js 20.19 では `/var/lang/node20/bin/node` です。

## 5. Deploy

アプリケーションをビルドし、 [CloudBase CLI](https://docs.cloudbase.net/en/cli-v1/functions/deploy) を使って HTTP function (Node.js 20.19) をデプロイします:

```sh
npm run build
tcb fn deploy <function-name> --httpFn
```

コンソールから zip ファイルをアップロードします。 詳細は、 [Node.js HTTP function quick start](https://docs.cloudbase.net/en/cloud-function/quickstart/httpfunc/nodejs) を確認してください。
