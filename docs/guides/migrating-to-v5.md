# v5 への移行

Hono v5 はコアを小さく保ち、それ以外を周囲に移動します。 このページでは v4 からの破壊的変更とコードの更新方法を一覧にしています。

## リリース候補を試す

```sh
npm install hono@next
```

## ESM のみ

`hono` は ESM のみで公開されます。 CommonJS ビルドは削除されました。

Node.js では、バージョン 22.12 以降が必要です。 `require('hono')` は依然として動作します。 Node.js 22.12 は ES モジュールを `require()` できるためです。

## ランタイムアダプターは別のパッケージです

`hono/<runtime>` 配下のランタイムアダプターは `hono` にバンドルされなくなりました。 対応するパッケージをインストールし、そこからインポートしてください。

| Before                    | After                      |
| ------------------------- | -------------------------- |
| `hono/aws-lambda`         | `@hono/aws-lambda`         |
| `hono/bun`                | `@hono/bun`                |
| `hono/cloudflare-workers` | `@hono/cloudflare-workers` |
| `hono/deno`               | `@hono/deno`               |
| `hono/lambda-edge`        | `@hono/lambda-edge`        |
| `hono/netlify`            | `@hono/netlify`            |
| `hono/service-worker`     | `@hono/service-worker`     |
| `hono/vercel`             | `@hono/vercel`             |

```ts
// Before
import { serveStatic } from 'hono/bun'

// After
import { serveStatic } from '@hono/bun'
```

`hono/cloudflare-pages` は置き換えなしで削除されました。 Cloudflare は静的アセット付きの Workers を推奨しているため、代わりに Workers 上で `hono` を使用してください。

`hono/adapter` (`env()` と `getRuntimeKey()`) は `hono` に残ります。

## `onError()` と `notFound()` はルーティング可能なミドルウェアを登録します

`onError()` は `(err, c)` の代わりに `(c, next)` シグネチャのミドルウェアを受け付けるようになりました。 エラーは `c.error` から読み取ってください:

```ts
// From
app.onError((err, c) => {
  console.error(err)
  return c.text('Custom Error', 500)
})

// To
app.onError((c) => {
  console.error(c.error)
  return c.text('Custom Error', 500)
})
```

`notFound((c) => c.text('Not Found', 404))` は同じ単一ハンドラーの構文を維持します。 どちらの API もオプションのパスと複数のミドルウェアを受け付けます:

```ts
app.notFound(
  '/api/*',
  async (c, next) => {
    c.header('x-not-found', 'api')
    await next()
  },
  (c) => c.text('API resource not found', 404)
)
```

両方の API に次のルーティングルールが適用されます:

- 登録は前のハンドラーを置き換えるのではなく合成されます。 チェーンを止めるにはレスポンスを返し、委譲するには `next()` を呼びます。
- パスはリクエストの HTTP メソッドに依存せず、`basePath()` からの相対です。 パスを省略すると現在のベースパス内に `*` が登録されます。
- `route()` は `notFound()` ハンドラーを含むサブアプリのハンドラーをインポートします。 より深くネストされたサブアプリが優先され、同じ深さではハンドラーは登録順に実行され、パスの特異性順ではありません。
- スコープは、元のルートを登録したアプリに関わらずリクエストパスにマッチします。 リクエストパラメータはフォールバックスコープではなく元のルートから取得されます。

`notFound()` ミドルウェアは、マッチしないリクエストと明示的な `c.notFound()` 呼び出しの両方で実行されます。 チェーンが最終的なレスポンスなしで終了した場合、組み込みのエラーまたは not-found ハンドラーが使用されます。 `onError()` ミドルウェアが投げたエラーは `app.fetch()` から脱出するのではなく、組み込みのエラーハンドラーによって処理されます。

## 非 Error の throw は `onError` へ

ハンドラーやミドルウェアから throw された文字列やプレーンオブジェクトのような非 Error 値は、`Error` でラップされて `onError` に渡されます。 元の値は `c.error.cause` から取得でき、throw された文字列は `c.error.message` としても使用されます。 これは `app.fetch()` の外には伝播しなくなりました。

## `getColorEnabledAsync()` は削除されました

`hono/utils/color` の `getColorEnabledAsync()` は削除されました。 Cloudflare Workers では `getColorEnabled()` を使用し、バインディングを渡してください。 `logger()` ミドルウェアは自身でこれを行うため、変更は不要です。

```ts
// Before
const enabled = await getColorEnabledAsync()

// After
const enabled = getColorEnabled(c.env)
```

## `c.req.query()` は `undefined` を返すことがあります

キーなしの `c.req.query()` と `c.req.queries()` は、キーが存在しないことがあるため、それぞれ `Record<string, string | undefined>` と `Record<string, string[] | undefined>` を返すようになりました。

```ts
// Before
const { name } = c.req.query() // string

// After
const { name } = c.req.query() // string | undefined
```

## `c.req.json()` は `unknown` を返します

`c.req.json()` は `Promise<any>` の代わりに `Promise<unknown>` を返します。 型を明示的に渡すか、バリデーターと共に `c.req.valid()` を使用してください。

```ts
// Before
const body = await c.req.json() // any

// After
const body = await c.req.json<{ name: string }>()
```

## `c.json()` は JSON シリアライズできない値で throw します

`c.json(undefined)` は以前は空のボディを返していました。 今では `Response.json()` のように `TypeError` を throw します。 関数やシンボルでも同様です。

## ワイルドカードマッチングはすべてのルーターで同じです

セグメントの末尾の `*` はすべてのルーターでワイルドカードとなり、何もマッチしないこともあります。 `/x*y` のようなセグメントの途中にある `*` はワイルドカードではありません。 `*` だけのセグメントは空でない一つのセグメントにマッチします。

| Route          | Path          | v5       |
| -------------- | ------------- | -------- |
| `/x*/y`        | `/x/y`        | Match    |
| `/x*/y`        | `/xz/y`       | Match    |
| `/x*/y`        | `/x/z/y`      | No match |
| `/x*y`         | `/xay`        | No match |
| `/wild/*/card` | `/wild//card` | No match |

TrieRouter と PatternRouter は以前 `/x*/y` を `/xz/y` にマッチさせていませんでした。 RegExpRouter では `/x*/y` と `/x/*` を一緒に登録できず `UnsupportedPathError` を throw するため、SmartRouter は TrieRouter にフォールバックします。

## 削除された非推奨機能

### `app.mount()`

代わりに [Mount ミドルウェア](/docs/middleware/builtin/mount) を使用してください。

```ts
import { mount } from 'hono/mount'

// Before
app.mount('/itty-router', ittyRouter.handle)

// After
app.all('/itty-router/*', mount(ittyRouter.handle))
```

### `app.fire()`

代わりに `@hono/service-worker` の `fire()` を使用してください。

```ts
import { fire } from '@hono/service-worker'

// Before
app.fire()

// After
fire(app)
```

### `c.req.matchedRoutes` and `c.req.routePath`

代わりに `hono/route` の `matchedRoutes()` と `routePath()` を使用してください。

```ts
import { routePath } from 'hono/route'

// Before
app.get('/posts/:id', (c) => c.text(c.req.routePath))

// After
app.get('/posts/:id', (c) => c.text(routePath(c)))
```

### SSG フックオプション

`toSSG()` の `beforeRequestHook`, `afterResponseHook`, `afterGenerateHook` オプションは削除されました。 代わりに `plugins` を通じてプラグインとして渡してください。 非 200 レスポンスをスキップする `defaultPlugin()` は `plugins` が省略された場合にのみ適用されるため、必要な場合は明示的に追加してください。

```ts
import { defaultPlugin, toSSG } from 'hono/ssg'

// Before
toSSG(app, fs, { beforeRequestHook })

// After
toSSG(app, fs, { plugins: [{ beforeRequestHook }, defaultPlugin()] })
```

### Others

- Bearer Auth ミドルウェア - `noAuthenticationHeaderMessage`, `invalidAuthenticationHeaderMessage`, `invalidTokenMessage` は削除されました。 代わりに `noAuthenticationHeader.message`, `invalidAuthenticationHeader.message`, `invalidToken.message` を使用してください。
- Serve Static ミドルウェア - `pathResolve` オプションは削除されました。 すでに使用されていませんでした。
- SSG ヘルパー - `SSG_DISABLED_RESPONSE` は削除されました。 代わりに `X_HONO_DISABLE_SSG_HEADER_KEY` を使用してください。
- `hono/utils/buffer` の `timingSafeEqual()` は文字列のみを受け付けます。 Basic Auth と Bearer Auth ミドルウェアの `hashFunction` オプションはそれに合わせて `(input: string) => string | null | Promise<string | null>` と型付けされています。
- `hono/utils/url` の `getQueryStrings()` は削除されました。 代わりに `URL` API を使用してください。
- `hono/utils/http-status` の `UnOfficalStatusCode` は削除されました。 代わりに `UnofficialStatusCode` を使用してください。
