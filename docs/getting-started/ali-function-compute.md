# Alibaba Cloud Function Compute

[Alibaba Cloud Function Compute](https://www.alibabacloud.com/en/product/function-compute) はフルマネージドな、イベント・ドリブンなコンピューティングサービスです。 Function Compute を使用するとサーバーのようなインフラを管理することなく、コードを書いてアップロードすることに集中できます。

このガイドではサードパーティアダプタの [rwv/hono-alibaba-cloud-fc3-adapter](https://github.com/rwv/hono-alibaba-cloud-fc3-adapter) を使って Alibaba Cloud Function Compute で Hono を動かします。

## 1. セットアップ

::: code-group

```sh [npm]
mkdir my-app
cd my-app
npm i hono hono-alibaba-cloud-fc3-adapter
npm i -D @serverless-devs/s esbuild
mkdir src
touch src/index.ts
```

```sh [yarn]
mkdir my-app
cd my-app
yarn add hono hono-alibaba-cloud-fc3-adapter
yarn add -D @serverless-devs/s esbuild
mkdir src
touch src/index.ts
```

```sh [pnpm]
mkdir my-app
cd my-app
pnpm add hono hono-alibaba-cloud-fc3-adapter
pnpm add -D @serverless-devs/s esbuild
mkdir src
touch src/index.ts
```

```sh [bun]
mkdir my-app
cd my-app
bun add hono hono-alibaba-cloud-fc3-adapter
bun add -D esbuild @serverless-devs/s
mkdir src
touch src/index.ts
```

:::

## 2. Hello World

`src/index.ts` を書きます。

```ts
import { Hono } from 'hono'
import { handle } from 'hono-alibaba-cloud-fc3-adapter'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export const handler = handle(app)
```

## 3. serverless-devs をセットアップする

> [serverless-devs](https://github.com/Serverless-Devs/Serverless-Devs) はオープンソースであり、オープンなサーバレス開発プラットフォームです。強力なツールチェーンシステムを開発者に提供しています。このプラットフォームを活用して、開発者は、ワンクリックでマルチクラウド対応のサーバレス製品を試用し、高速にサーバレスプロジェクトをデプロイできるだけでなく、サーバレスアプリケーションのライフサイクル全体にわたってプロジェクトを管理できます。さらに、研究開発や運用保守の効率を高めるために、サーバレス開発を他のツールやプラットフォームを使ってとても簡単にかつ迅速に連携することができます。

Alibaba Cloud AccessKeyID と AccessKeySecret を追加します。

```sh
npx s config add
# Please select a provider: Alibaba Cloud (alibaba)
# Input your AccessKeyID & AccessKeySecret
```

`s.yaml` を書きます。

```yaml
edition: 3.0.0
name: my-app
access: 'default'

vars:
  region: 'us-west-1'

resources:
  my-app:
    component: fc3
    props:
      region: ${vars.region}
      functionName: 'my-app'
      description: 'Hello World by Hono'
      runtime: 'nodejs20'
      code: ./dist
      handler: index.handler
      memorySize: 1024
      timeout: 300
```

`package.json` の `scripts` を追加します:

```json
{
  "scripts": {
    "build": "esbuild --bundle --outfile=./dist/index.js --platform=node --target=node20 ./src/index.ts",
    "deploy": "s deploy -y"
  }
}
```

## 4. デプロイ

最後に、コマンドでデプロイしましょう:

```sh
npm run build # TypeScript コードを JavaScript にコンパイルします
npm run deploy # Alibaba Cloud Function Compute に関数をデプロイします
```
