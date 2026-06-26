# ミドルウェア

ミドルウェアはエンドポイントのハンドラの前後で動作します。 ディスパッチ前に `Request` を取得したり、ディスパッチ後に `Response` を操作したりできます。

## ミドルウェアの定義

- ハンドラ - `Response` オブジェクトを返す必要があります。 一つのヘルパーのみが実行されます。
- ミドルウェア - `await next()` を実行するべきです。 次のミドルウェアをコールするには何も返さない、**または** 途中で exit するために `Response` を返します。

ミドルウェアの登録には `app.use` か `app.HTTP_METHOD` をハンドラと同じように登録できます。 この方法ではパスや HTTP メソッドを簡単に指定できます。

```ts
// あらゆるメソッドと全てのルートにマッチする
app.use(logger())

// パスを指定する
app.use('/posts/*', cors())

// メソッドトパスを指定する
app.post('/posts/*', basicAuth())
```

ハンドラが `Response` を返した場合、エンドユーザのために使用されて、処理が終了します。

```ts
app.post('/posts', (c) => c.text('Created!', 201))
```

この場合、ディスパッチ前に4つのミドルウェアが使用されます:

```ts
logger() -> cors() -> basicAuth() -> *handler*
```

## 実行順序

ミドルウェアが実行される順序は、ミドルウェアが登録された順序によって決まります。
最初に登録されたミドルウェアの `next` より前の処理が最初に実行され、
`next` 以降の処理が最後に実行されます。
実例を見てください。

```ts
app.use(async (_, next) => {
  console.log('middleware 1 start')
  await next()
  console.log('middleware 1 end')
})
app.use(async (_, next) => {
  console.log('middleware 2 start')
  await next()
  console.log('middleware 2 end')
})
app.use(async (_, next) => {
  console.log('middleware 3 start')
  await next()
  console.log('middleware 3 end')
})

app.get('/', (c) => {
  console.log('handler')
  return c.text('Hello!')
})
```

このような結果になります。

```
middleware 1 start
  middleware 2 start
    middleware 3 start
      handler
    middleware 3 end
  middleware 2 end
middleware 1 end
```

ハンドラあるいはミドルウェアがエラーをスローした場合、 hono はエラーをキャッチし、 [app.onError() コールバック](/docs/api/hono#error-handling) に渡されるか、自動的にレスポンスコード 500 に変換してミドルウェアチェーンの上位に返します。 つまり、next() は決してスローしないので、 try/catch/finally でラップする必要はありません。

## ビルトインミドルウェア

Hono にはビルトインミドルウェアがあります。

```ts
import { Hono } from 'hono'
import { poweredBy } from 'hono/powered-by'
import { logger } from 'hono/logger'
import { basicAuth } from 'hono/basic-auth'

const app = new Hono()

app.use(poweredBy())
app.use(logger())

app.use(
  '/auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)
```

::: warning
Deno では、 Hono のバージョンとミドルウェアのバージョンが異なったものを使用することができます。 しかし、これはバグを引き起こす可能性があります。
たとえば、バージョンが異なっているためこのコードは動作しません。

```ts
import { Hono } from 'jsr:@hono/hono@4.4.0'
import { upgradeWebSocket } from 'jsr:@hono/hono@4.4.5/deno'

const app = new Hono()

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    // ...
  }))
)
```

:::

## カスタムミドルウェア

独自のミドルウェアを作成できます。

```ts
// カスタムロガー
app.use(async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})

// カスタムヘッダを追加
app.use('/message/*', async (c, next) => {
  await next()
  c.header('x-message', 'This is middleware!')
})

app.get('/message/hello', (c) => c.text('Hello Middleware!'))
```

しかし、 `app.use()` 内で直接ミドルウェアを挿入すると、再利用性に制限がかかります。 そのため、別ファイルにミドルウェアを分けることができます。

`context` や `next` に対して型定義を失わないことを保証するために、ミドルウェアを分割する際に、 Hono の factory から [`createMiddleware()`](/docs/helpers/factory#createmiddleware) を使用することができます。 下位のハンドラから型安全に [`Context` で `set` したデータにアクセス](https://hono.dev/docs/api/context#set-get) することができます。

```ts
import { createMiddleware } from 'hono/factory'

const logger = createMiddleware(async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})
```

:::info
`createMiddleware` で型ジェネリクスを使用することができます:

```ts
createMiddleware<{Bindings: Bindings}>(async (c, next) =>
```

:::

### Next の後で Response を変更する

さらに、ミドルウェアは必要があればレスポンスを変更できるようにデザインされています:

```ts
const stripRes = createMiddleware(async (c, next) => {
  await next()
  c.res = undefined
  c.res = new Response('New Response')
})
```

## ミドルウェア引数の Context にアクセスする

ミドルウェアの引数の context にアクセスするために、 `app.use` で提供される context パラメータを直接使用します。 下記のサンプルをみてください。

```ts
import { cors } from 'hono/cors'

app.use('*', async (c, next) => {
  const middleware = cors({
    origin: c.env.CORS_ORIGIN,
  })
  return middleware(c, next)
})
```

### ミドルウェア内で Context を拡張する

ミドルウェア内で Context を拡張するには、 `c.set` を使用します。 `createMiddleware` 関数に `{ Variables: { yourVariable: YourVariableType } }` というジェネリクス引数を渡すことで型安全に拡張が可能です。

```ts
import { createMiddleware } from 'hono/factory'

const echoMiddleware = createMiddleware<{
  Variables: {
    echo: (str: string) => string
  }
}>(async (c, next) => {
  c.set('echo', (str) => str)
  await next()
})

app.get('/echo', echoMiddleware, (c) => {
  return c.text(c.var.echo('Hello!'))
})
```

### チェーンされたミドルウェアを渡る型インタフェース

`.use()` を使用して複数のミドルウェアをチェーンする際に、 Hono は自動的に `Variables` 型を蓄積します。 ミドルウェアチェーンに従うルートハンドラは、型安全な方法で先に実行されているミドルウェアのすべての変数にアクセスすることができます:

```ts
import { createMiddleware } from 'hono/factory'

const authMiddleware = createMiddleware<{
  Variables: { user: { id: string; name: string } }
}>(async (c, next) => {
  c.set('user', { id: '123', name: 'Alice' })
  await next()
})

const dbMiddleware = createMiddleware<{
  Variables: { db: { query: (sql: string) => Promise<unknown> } }
}>(async (c, next) => {
  c.set('db', {
    query: async (sql) => {
      /* ... */
    },
  })
  await next()
})

const app = new Hono()
  .use(authMiddleware)
  .use(dbMiddleware)
  .get('/', (c) => {
    // `user` と `db` 両方が有効で型安全
    const user = c.var.user // { id: string; name: string }
    const db = c.var.db // { query: (sql: string) => Promise<unknown> }
    return c.json({ user })
  })
```

これは動作します。 それぞれの `.use()` コールは、マージされた型を持つ新しい Hono インスタンスを返します。 そして、ミドルウェアはチェーンされるので型が成長します。 このおかげで、多くの場合に結合された `Env` 型を事前に手動で宣言する必要性がなくなります。

## サードパーティーミドルウェア

ビルトインミドルウェアは外部モジュールに依存しません、しかしサードパーティーミドルウェアはサードパーティー製ライブラリに依存している可能性があります。そのため、それらを使用してより複雑なアプリケーションを作成できるでしょう。

様々な[サードパーティミドルウェア](https://hono.dev/docs/middleware/third-party) を調べることができます。
例えば、 GraphQL サーバーミドルウェア、 Sentry ミドルウェア、 Firebase Auth ミドルウェア等...
