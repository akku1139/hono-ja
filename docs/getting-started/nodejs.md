# Node.js

[Node.js](https://nodejs.org/) はオープンソースでクロスプラットフォームの JavaScript ランタイム環境です。

Hono は Node.js 向けに設計されたわけではありませんが、 [Node.js Adapter](https://github.com/honojs/node-server) を使うと Node.js でも実行できます。

::: info
Node.js 18.x 以上で動作します。 具体的に必要な Node.js のバージョンは以下の通りです:

- 18.x => 18.14.1+
- 19.x => 19.7.0+
- 20.x => 20.0.0+

具体的には、各メジャーリリースの最新バージョンを使用するだけです。
:::

## 1. セットアップ

Node.js のスターターが利用可能です。
"create-hono" コマンドでプロジェクトを開始してください。
この例では `nodejs` テンプレートを選択してください。

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
`my-app` に移動して依存パッケージをインストールします。

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

`src/index.ts` を編集します:

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Node.js!'))

serve(app)
```

サーバをグレースフルシャットダウンしたい場合は、次のように記述します:

```ts
const server = serve(app)

// graceful shutdown
process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})
```

## 3. 実行

開発サーバーをローカルで起動し、 Web ブラウザで `http://localhost:3000` にアクセスします。

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

:::

## ポート番号の変更

`port` オプションでポート番号を指定できます。

```ts
serve({
  fetch: app.fetch,
  port: 8787,
})
```

## WebSocket

WebSocket サポートは `@hono/node-server` に組み込まれています。 `ws` をインストールし、 TypeScript を使用している場合は `@types/ws` もインストールします。 次に、 `{ noServer: true }` を指定して `WebSocketServer` を生成し、 `websocket` オプションを使用して `serve()` に渡します。

`@hono/node-ws` は非推奨です。

```ts
import { serve, upgradeWebSocket } from '@hono/node-server'
import { Hono } from 'hono'
import { WebSocketServer } from 'ws'

const app = new Hono()

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      ws.send(event.data)
    },
  }))
)

const wss = new WebSocketServer({ noServer: true })

serve({
  fetch: app.fetch,
  websocket: { server: wss },
})
```

## 生の Node.js API へのアクセス

Node.js API は `c.env.incoming` と `c.env.outgoing` からアクセスできます。

```ts
import { Hono } from 'hono'
import { serve, type HttpBindings } from '@hono/node-server'
// or `Http2Bindings` if you use HTTP2

type Bindings = HttpBindings & {
  /* ... */
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.json({
    remoteAddress: c.env.incoming.socket.remoteAddress,
  })
})

serve(app)
```

## 静的ファイルの配信

`serveStatic` を使うことでローカルファイルシステムから静的ファイルを配信できます。 例えば、ディレクトリ構造が次のような場合を考えます:

```sh
./
├── favicon.ico
├── index.ts
└── static
    ├── hello.txt
    └── image.png
```

パス `/static/*` へのリクエストが来て、 `./static` 配下のファイルを返したい場合、次のように記述できます:

```ts
import { serveStatic } from '@hono/node-server/serve-static'

app.use('/static/*', serveStatic({ root: './' }))
```

::: warning
`root` オプションは、カレントの作業ディレクトリ (`process.cwd()`) からの相対パスで解決します。 これは、サーバを実行している場所ではなく、 **ソースファイルが置かれている場所によって動作が異なる** ことを意味します。 異なるディレクトリからサーバを起動した場合、ファイル解決が失敗する可能性があります。

ソースファイルと常に同じディレクトリを指す信頼できるパス解決を行うには、 `import.meta.url` を使用してください:

```ts
import { fileURLToPath } from 'node:url'
import { serveStatic } from '@hono/node-server/serve-static'

app.use(
  '/static/*',
  serveStatic({ root: fileURLToPath(new URL('./', import.meta.url)) })
)
```

:::

ディレクトリルートの `favicon.ico` を配信するには `path` オプションを使用します:

```ts
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
```

パス `/hello.txt` や `/image.png` へのリクエストが来て、 `./static/hello.txt` や `./static/image.png` という名前のファイルを返したい場合、次のように使用できます:

```ts
app.use('*', serveStatic({ root: './static' }))
```

### `rewriteRequestPath`

`http://localhost:3000/static/*` を `./statics` にマップしたい場合、 `rewriteRequestPath` オプションを使用できます:

```ts
app.get(
  '/static/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) =>
      path.replace(/^\/static/, '/statics'),
  })
)
```

## http2

Hono を [Node.js http2 Server](https://nodejs.org/api/http2.html) でも実行できます。

### 暗号化されていない http2

```ts
import { createServer } from 'node:http2'

const server = serve({
  fetch: app.fetch,
  createServer,
})
```

### 暗号化された http2

```ts
import { createSecureServer } from 'node:http2'
import { readFileSync } from 'node:fs'

const server = serve({
  fetch: app.fetch,
  createServer: createSecureServer,
  serverOptions: {
    key: readFileSync('localhost-privkey.pem'),
    cert: readFileSync('localhost-cert.pem'),
  },
})
```

## ビルドとデプロイ

::: code-group

```sh [npm]
npm run build
```

```sh [yarn]
yarn run build
```

```sh [pnpm]
pnpm run build
```

```sh [bun]
bun run build
```

::: info
フロントエンドのフレームワークをもつアプリケーションは [Hono's Vite plugins](https://github.com/honojs/vite-plugins) を使用する必要があるかもしれません。
:::

### Dockerfile

Node.js の Dockerfile の例は次の通りです。

```Dockerfile
FROM node:22-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

COPY package*json tsconfig.json src ./

RUN npm ci && \
    npm run build && \
    npm prune --production

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

USER hono
EXPOSE 3000

CMD ["node", "/app/dist/index.js"]
```
