# ベストプラクティス

Hono はとても柔軟です。 あなたの好きなようにアプリを書くことが出来ます。
しかし、従ったほうが良いベストプラクティスもあります。

## できるだけ "コントローラー" を作らないでください

極力、 "Ruby on Rails のようなコントローラー" は作るべきではありません。

```ts
// 🙁
// A RoR-like Controller
const booksList = (c: Context) => {
  return c.json('list books')
}

app.get('/books', booksList)
```

問題は型に関係しています。 例えば、複雑なジェネリクスを書かない限り、コントローラーではパスパラメータを推論できません。

```ts
// 🙁
// A RoR-like Controller
const bookPermalink = (c: Context) => {
  const id = c.req.param('id') // Can't infer the path param
  return c.json(`get ${id}`)
}
```

そのため、 RoR-like なコントローラーを作る必要はなく、パス定義の直後にハンドラを書くべきです。

```ts
// 😃
app.get('/books/:id', (c) => {
  const id = c.req.param('id') // Can infer the path param
  return c.json(`get ${id}`)
})
```

## `hono/factory` の `factory.createHandlers()`

それでも RoR-like なコントローラーを作りたい場合、 [`hono/factory`](/docs/helpers/factory) の `factory.createHandlers()` を使ってください。 これを使う場合、型推論は正しく動作します。

```ts
import { createFactory } from 'hono/factory'
import { logger } from 'hono/logger'

// ...

// 😃
const factory = createFactory()

const middleware = factory.createMiddleware(async (c, next) => {
  c.set('foo', 'bar')
  await next()
})

const handlers = factory.createHandlers(logger(), middleware, (c) => {
  return c.json(c.var.foo)
})

app.get('/api', ...handlers)
```

## 大きなアプリケーションを作る

"Ruby on Rails のようなコントローラー" を作ること無く大きなアプリケーションを作るには `app.route()` を使います。

アプリケーションに `/authors` と `/books` というエンドポイントがあって `index.ts` を分割したい場合は `authors.ts` と `books.ts` を作成します。

```ts
// authors.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json('list authors'))
app.post('/', (c) => c.json('create an author', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

```ts
// books.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json('list books'))
app.post('/', (c) => c.json('create a book', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

次に、それらをインポートし `app.route()` で `/authors` と `/books` をマウントします。

```ts
// index.ts
import { Hono } from 'hono'
import authors from './authors'
import books from './books'

const app = new Hono()

// 😃
app.route('/authors', authors)
app.route('/books', books)

export default app
```

### RPC 機能を使いたい場合

上のコードは普通の使い方ではうまく動きます。
しかし、 `RPC` 機能を使いたい場合は以下のように変更することで正しい型にすることができます。

```ts
// authors.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/', (c) => c.json('list authors'))
  .post('/', (c) => c.json('create an author', 201))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
export type AppType = typeof app
```

`app` の型を `hc` に渡すことで、正しい型になります。

```ts
import type { AppType } from './authors'
import { hc } from 'hono/client'

// 😃
const client = hc<AppType>('http://localhost') // Typed correctly
```

詳しくは、 [RPC のページ](/docs/guides/rpc#using-rpc-with-larger-applications) を御覧ください。

## HEAD リクエストのベストプラクティス

### Hono の HEAD 処理を理解する

Hono は、自動的に HEAD リクエストを GET リクエストに変更し、レスポンスボディを除去することで HEAD リクエストを処理します。 この振る舞いはフレームワークのディスパッチ層に組み込まれており、ルートマッチングが起きる前に行われます。

### ✅ 動作する: HEAD リクエスト用に GET ルートを使用する

```typescript
// GOOD: この GET ルートは自動的に HEAD リクエストを処理します
app.get('/api/users', async (c) => {
  const users = await getUsers()
  c.header('X-Total-Count', users.length.toString())
  return c.json(users)
})

// HEAD /api/users リクエストは次の内容を返します:
// - GET と同じヘッダ (X-Total-Count を含む)
// - Status 200
// - No body (null)
```

### ✅ 動作する: HEAD 固有のロジック用にミドルウェアを使用する

```typescript
// GOOD: HEAD が異なる振る舞いが必要な際にミドルウェアを使用する
app.use('/api/resource', async (c, next) => {
  await next()

  // ハンドラの後処理で HEAD 固有のヘッダを追加
  if (c.req.method === 'HEAD') {
    c.header('X-HEAD-Processed', 'true')
    // HEAD 用に過度なボディの内容を計算しない
    c.res = new Response(null, c.res)
  }
})
```

### ❌ 動作しない: HEAD 専用のハンドラを生成してみる

```typescript
// BAD: これは期待通りには動作しません
app.head('/api/users', (c) => {
  // このハンドラは決して呼ばれません
  c.header('X-Custom', 'value')
  return c.text('ignored')
})

// BAD: on() を使用しても動作しません
app.on('HEAD', '/api/users', (c) => {
  // ルートマッチングする前に GET に変換されます
})
```

### パフォーマンスの考慮

- **多くの HEAD リクエストを期待している場合、 GET ハンドラで重い処理を避ける**: HEAD を検知し、ボディの生成をスキップするためにミドルウェアを使用します
- **キャッシュヘッダは同様に動作します**: HEAD レスポンスは GET と同じキャッシュルールに従います
- **ミドルウェアの互換性**: 大抵のミドルウェアは、 HEAD を処理します。 しかし、(圧縮のような) ボディを処理するミドルウェアは自動的に HEAD リクエストをスキップします

### HEAD リクエストをテストする

```typescript
// 常に GET と HEAD 両方のレスポンスをテストします
it('handles HEAD requests correctly', async () => {
  const getRes = await app.request('/api/users')
  const headRes = await app.request('/api/users', { method: 'HEAD' })

  expect(headRes.status).toBe(getRes.status)
  expect(headRes.headers.get('X-Total-Count')).toBe(
    getRes.headers.get('X-Total-Count')
  )
  expect(headRes.body).toBe(null)
})
```

### 注記

- 自動的な HEAD の変換は、GET と HEAD レスポンス間でヘッダの一貫性を保証します
- この振る舞いは、すべての Hono ランタイム (Cloudflare Workers, Deno, Bun, Node.js) で一貫性があります
- HEAD と GET で全く異なるロジックが必要な場合、フレームワークの HEAD 処理をオーバーライドするよりもエンドポイントを分けて使用することを検討してください
