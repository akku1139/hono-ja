# Deno

[Deno](https://deno.com/) は V8 上に構築された JavaScript ランタイムです。 Node.js ではありません。
Hono は Deno でも動作します。

Hono を使用して TypeScript でコードを書き、 `deno` コマンドでアプリケーションを起動します。 そして "Deno Deploy" にデプロイ出来ます。

## 1. Deno のインストール

まず `deno` コマンドをインストールします。
[公式ドキュメント](https://docs.deno.com/runtime/manual/getting_started/installation) を参照してください。

## 2. セットアップ

Deno でもスターターを使用できます。
"create-hono" コマンドでプロジェクトを作成してください。

```sh
deno init --npm hono my-app
```

Select `deno` template for this example.

`my-app` に移動しますが、 Deno では Hono を明示的にインストールする必要はありません。

```sh
cd my-app
```

## 3. Hello World

最初のアプリケーションを書いていきましょう。

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Deno!'))

Deno.serve(app.fetch)
```

## 4. Run

このコマンドだけです:

```sh
deno task start
```

## ポートを変える

`main.ts` の `Deno.serve` の引数を変更することでポート番号を指定できます:

```ts
Deno.serve(app.fetch) // [!code --]
Deno.serve({ port: 8787 }, app.fetch) // [!code ++]
```

## 静的ファイルの提供

静的ファイルを提供するには `hono/middleware.ts` から `serveStatic` をインポートして使用します。

```ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/deno'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
app.get('/', (c) => c.text('You can access: /static/hello.txt'))
app.get('*', serveStatic({ path: './static/fallback.txt' }))

Deno.serve(app.fetch)
```

上のコードは、このようなディレクトリ構成で機能します。

```
./
├── favicon.ico
├── index.ts
└── static
    ├── demo
    │   └── index.html
    ├── fallback.txt
    ├── hello.txt
    └── images
        └── dinotocat.png
```

### `rewriteRequestPath`

`http://localhost:8000/static/*` を `./statics` にマップしたい場合、 `rewriteRequestPath` をオプションに追加してください:

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

### `mimes`

MIME タイプを追加するためには `mimes` を使用します:

```ts
app.get(
  '/static/*',
  serveStatic({
    mimes: {
      m3u8: 'application/vnd.apple.mpegurl',
      ts: 'video/mp2t',
    },
  })
)
```

### `onFound`

要求されたファイルが見つかったときの処理を `onFound` で指定できます:

```ts
app.get(
  '/static/*',
  serveStatic({
    // ...
    onFound: (_path, c) => {
      c.header('Cache-Control', `public, immutable, max-age=31536000`)
    },
  })
)
```

### `onNotFound`

`onNotFound` を使用して、要求されたファイルが見つからない場合の処理を記述できます:

```ts
app.get(
  '/static/*',
  serveStatic({
    onNotFound: (path, c) => {
      console.log(`${path} is not found, you access ${c.req.path}`)
    },
  })
)
```

### `precompressed`

`precompressed` オプションを使うと `Accept-Encoding` ヘッダに基づいて `.br` や `.gz` といった拡張子を持っているファイルが有るか確認し、提供します。 Brotli 、 Zstd 、 Gzip の順で優先されます。 それらが無ければ元のファイルが提供されます。

```ts
app.get(
  '/static/*',
  serveStatic({
    precompressed: true,
  })
)
```

## Deno Deploy

Deno Deploy は Deno のためのエッジランタイムプラットフォームです。
Deno Deploy でワールドワイドにアプリケーションを公開できます。

Hono は Deno Deploy もサポートしています。 [公式ドキュメント](https://docs.deno.com/deploy/manual/)を参照してください。

## テスト

Deno でアプリケーションをテストするのは簡単です。
`Deno.test` と、公式ライブラリの `assert` か `assertEquals` を [@std/assert](https://jsr.io/@std/assert) からインポートして書いてください。

```sh
deno add jsr:@std/assert
```

```ts
import { Hono } from 'hono'
import { assertEquals } from '@std/assert'

Deno.test('Hello World', async () => {
  const app = new Hono()
  app.get('/', (c) => c.text('Please test me'))

  const res = await app.request('http://localhost/')
  assertEquals(res.status, 200)
})
```

次にこのコマンドを実行します:

```sh
deno test hello.ts
```

## `npm:` 指定子

`npm:hono` も使えます。 これを使うためには `deno.json` を修正します:

```json
{
  "imports": {
    "hono": "jsr:@hono/hono" // [!code --]
    "hono": "npm:hono" // [!code ++]
  }
}
```

`npm:hono` か `jsr:@hono/hono` のどちらかを使うことができます。

`npm:@hono/zod-validator` といったサードパーティミドルウェアを TypeScript の型推論付きで使用したい場合は、 `npm:` 指定子が必要です。

```json
{
  "imports": {
    "hono": "npm:hono",
    "zod": "npm:zod",
    "@hono/zod-validator": "npm:@hono/zod-validator"
  }
}
```
