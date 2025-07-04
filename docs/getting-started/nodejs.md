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

スターターは Node.js もサポートしています。
"create-hono" コマンドで開発を開始しましょう。
この例では `nodejs` テンプレートを選びます。

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

If you want to gracefully shut down the server, write it like this:

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

## 3. Run

開発サーバーをローカルで起動し、ブラウザで `http://localhost:3000` にアクセスします。

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

## ポートを変える

`port` オプションでポート番号を指定できます。

```ts
serve({
  fetch: app.fetch,
  port: 8787,
})
```

## 生の Node.js API にアクセスする

Node.js API は `c.env.incoming` と `c.env.outgoing` で使用できます。

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

`serveStatic` を使うことでローカルファイルシステムから静的ファイルを配信できます。 以下のようなディレクトリ構成の場合を考えてみましょう:

```sh
./
├── favicon.ico
├── index.ts
└── static
    ├── hello.txt
    └── image.png
```

`/static/*` にリクエストがあったときに `./static` にあるファイルを返したい場合は、下のように書けます:

```ts
import { serveStatic } from '@hono/node-server/serve-static'

app.use('/static/*', serveStatic({ root: './' }))
```

`path` オプションを使って、ルートにある `favicon.ico` を配信します:

```ts
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
```

`/hello.txt` や `/image.png` がリクエストされたときに、 `./static/hello.txt` や `./static/image.png` といったファイル名のファイルを返すには、以下のように使います:

```ts
app.use('*', serveStatic({ root: './static' }))
```

### `rewriteRequestPath`

`http://localhost:3000/static/*` を `./statics` にマップしたい場合は `rewriteRequestPath` オプションを使用できます:

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

### unencrypted http2

```ts
import { createServer } from 'node:http2'

const server = serve({
  fetch: app.fetch,
  createServer,
})
```

### encrypted http2

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

## Building & Deployment

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
Apps with a front-end framework may need to use [Hono's Vite plugins](https://github.com/honojs/vite-plugins).
:::

### Dockerfile

以下は Node.js の Dockerfile の例です。

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
