# RPC

RPC 機能を使用すると、サーバとクライアント間で API の仕様を共有することができます。

まず、サーバのコードから Hono アプリケーション (一般的には `AppType` と呼ばれます) - またはクライアントで利用したいルート - を `typeof` したものをエクスポートします。

ジェネリック引数として `AppType` を受け取ることで、 Hono クライアントは、バリデータで指定された入力の型と `c.json()` を使ってハンドラが返した出力の型の両方を推論することができます。

> [!NOTE]
> RPC の型が monorepo で適切に動作するには、クライアントとサーバ両方の tsconfig.json ファイル内で、 `compilerOptions` に `"strict": true` を設定します。 [詳細はこちら](https://github.com/honojs/hono/issues/2270#issuecomment-2143745118)

## サーバ

サーバ側でしなければならないことはバリデータを記述することで、変数 `route` を生成します。 次のサンプルでは [Zod Validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator) を使用します。

```ts{1}
const route = app.post(
  '/posts',
  zValidator(
    'form',
    z.object({
      title: z.string(),
      body: z.string(),
    })
  ),
  (c) => {
    // ...
    return c.json(
      {
        ok: true,
        message: 'Created!',
      },
      201
    )
  }
)
```

> [!TIP]
> [Standard Schema Validator](https://github.com/honojs/middleware/tree/main/packages/standard-validator) も動作するので、 Valibot などの Standard Schema 互換のライブラリを使用できます。

次に、クライアントに API を共有するために型をエクスポートします。

```ts
export type AppType = typeof route
```

## クライアント

クライアント側では、まず `hc` と `AppType` をインポートします。

```ts
import type { AppType } from '.'
import { hc } from 'hono/client'
```

`hc` はクライアントを生成する関数です。 ジェネリクスとして `AppType` を渡し、引数としてサーバの URL を指定します。

```ts
const client = hc<AppType>('http://localhost:8787/')
```

`client.{path}.{method}` をコールし、引数としてサーバに送りたいデータを渡します。

```ts
const res = await client.posts.$post({
  form: {
    title: 'Hello',
    body: 'Hono is a cool project',
  },
})
```

`res` は "fetch" レスポンスと互換性があります。 `res.json()` を使ってサーバからデータを取り出すことができます。

```ts
if (res.ok) {
  const data = await res.json()
  console.log(data.message)
}
```

### クッキー

クライアントがリクエスト毎にクッキーを送るためには、クライアント生成時、オプションに `{ 'init': { 'credentials": 'include' } }` を追加します。

```ts
// client.ts
const client = hc<AppType>('http://localhost:8787/', {
  init: {
    credentials: 'include',
  },
})

// This request will now include any cookies you might have set
const res = await client.posts.$get({
  query: {
    id: '123',
  },
})
```

## ステータスコード

`c.json()` で `200` や `404` のようなステータスコードを明示的に指定したい場合、クライアントに渡す型として追加します。

```ts
// server.ts
const app = new Hono().get(
  '/posts',
  zValidator(
    'query',
    z.object({
      id: z.string(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('query')
    const post: Post | undefined = await getPost(id)

    if (post === undefined) {
      return c.json({ error: 'not found' }, 404) // Specify 404
    }

    return c.json({ post }, 200) // Specify 200
  }
)

export type AppType = typeof app
```

ステータスコードによってデータを取得できます。

```ts
// client.ts
const client = hc<AppType>('http://localhost:8787/')

const res = await client.posts.$get({
  query: {
    id: '123',
  },
})

if (res.status === 404) {
  const data: { error: string } = await res.json()
  console.log(data.error)
}

if (res.ok) {
  const data: { post: Post } = await res.json()
  console.log(data.post)
}

// { post: Post } | { error: string }
type ResponseType = InferResponseType<typeof client.posts.$get>

// { post: Post }
type ResponseType200 = InferResponseType<
  typeof client.posts.$get,
  200
>
```

## Global Response

Hono RPC クライアントは、 `app.onError()` やグローバルミドルウェアのようなグローバルエラーハンドラからレスポンス型を自動的に推論しません。 `ApplyGlobalResponse` 型ヘルパーを使用すると、グローバルなエラーレスポンス型をすべてのルートにマージできます。

```ts
import type { ApplyGlobalResponse } from 'hono/client'

const app = new Hono()
  .get('/api/users', (c) => c.json({ users: ['alice', 'bob'] }, 200))
  .onError((err, c) => c.json({ error: err.message }, 500))

type AppWithErrors = ApplyGlobalResponse<
  typeof app,
  {
    500: { json: { error: string } }
  }
>

const client = hc<AppWithErrors>('http://localhost')
```

これでクライアントは成功レスポンスとエラーレスポンスの両方を認識します:

```ts
const res = await client.api.users.$get()

if (res.ok) {
  const data = await res.json() // { users: string[] }
}

// InferResponseType includes the global error type
type ResType = InferResponseType<typeof client.api.users.$get>
// { users: string[] } | { error: string }
```

複数のグローバルなエラーステータスコードを一度に定義することもできます:

```ts
type AppWithErrors = ApplyGlobalResponse<
  typeof app,
  {
    401: { json: { error: string; message: string } }
    500: { json: { error: string; message: string } }
  }
>
```

## Not Found

クライアントを使用したい場合、 Not Found レスポンスを返すのに `c.notFound()` を使用すべきではありません。 クライアントがサーバから取得するデータを正しく推論できなくなります。

```ts
// server.ts
export const routes = new Hono().get(
  '/posts',
  zValidator(
    'query',
    z.object({
      id: z.string(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('query')
    const post: Post | undefined = await getPost(id)

    if (post === undefined) {
      return c.notFound() // ❌️
    }

    return c.json({ post })
  }
)

// client.ts
import { hc } from 'hono/client'

const client = hc<typeof routes>('/')

const res = await client.posts[':id'].$get({
  param: {
    id: '123',
  },
})

const data = await res.json() // 🙁 data is unknown
```

Not Found レスポンスには `c.json()` を使用し、ステータスコードを指定してください。

```ts
export const routes = new Hono().get(
  '/posts',
  zValidator(
    'query',
    z.object({
      id: z.string(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('query')
    const post = await getPost(id)

    if (!post) {
      return c.json({ error: 'not found' }, 404) // Specify 404
    }

    return c.json({ post }, 200) // Specify 200
  }
)
```

または、モジュール拡張を使って `NotFoundResponse` インターフェースを拡張できます。 これにより、 `c.notFound()` が型付きのレスポンスを返せるようになります:

```ts
// server.ts
import { Hono, TypedResponse } from 'hono'

declare module 'hono' {
  interface NotFoundResponse
    extends Response,
      TypedResponse<{ error: string }, 404, 'json'> {}
}

const app = new Hono()
  .get('/posts/:id', async (c) => {
    const post = await getPost(c.req.param('id'))
    if (!post) {
      return c.notFound()
    }
    return c.json({ post }, 200)
  })
  .notFound((c) => c.json({ error: 'not found' }, 404))

export type AppType = typeof app
```

これでクライアントは 404 レスポンスの型を正しく推論できるようになります。

## パスパラメータ

パスパラメータやクエリ値を含むルートも扱えます。

```ts
const route = app.get(
  '/posts/:id',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().optional(), // coerce to convert to number
    })
  ),
  (c) => {
    // ...
    return c.json({
      title: 'Night',
      body: 'Time to sleep',
    })
  }
)
```

パスパラメータとクエリ値は、実際の値が異なる型であっても **必ず** `string` として渡す必要があります。

パスに含めたい文字列は `param` で、クエリ値は `query` で指定します。

```ts
const res = await client.posts[':id'].$get({
  param: {
    id: '123',
  },
  query: {
    page: '1', // `string`, converted by the validator to `number`
  },
})
```

### 複数のパラメータ

複数のパラメータを持つルートを扱います。

```ts
const route = app.get(
  '/posts/:postId/:authorId',
  zValidator(
    'query',
    z.object({
      page: z.string().optional(),
    })
  ),
  (c) => {
    // ...
    return c.json({
      title: 'Night',
      body: 'Time to sleep',
    })
  }
)
```

パス内のパラメータを指定するには `['']` を複数追加します。

```ts
const res = await client.posts[':postId'][':authorId'].$get({
  param: {
    postId: '123',
    authorId: '456',
  },
  query: {},
})
```

### スラッシュを含める

`hc` 関数は `param` の値を URL エンコードしません。 パラメータにスラッシュを含めるには、[正規表現](/docs/api/routing#regexp) を使用してください。

```ts
// client.ts

// Requests /posts/123/456
const res = await client.posts[':id'].$get({
  param: {
    id: '123/456',
  },
})

// server.ts
const route = app.get(
  '/posts/:id{.+}',
  zValidator(
    'param',
    z.object({
      id: z.string(),
    })
  ),
  (c) => {
    // id: 123/456
    const { id } = c.req.valid('param')
    // ...
  }
)
```

> [!NOTE]
> 正規表現を使用しない基本的なパスパラメータは、スラッシュにマッチしません。 hc 関数を使用してスラッシュを含む `param` を渡す場合、サーバは意図した通りにルーティングしない可能性があります。 正しいルーティングを保証するには、 `encodeURIComponent` を使用してパラメータをエンコードすることが推奨されます。

## ヘッダー

リクエストにヘッダーを追加できます。

```ts
const res = await client.search.$get(
  {
    //...
  },
  {
    headers: {
      'X-Custom-Header': 'Here is Hono Client',
      'X-User-Agent': 'hc',
    },
  }
)
```

すべてのリクエストに共通のヘッダーを追加するには、 `hc` 関数の引数として指定します。

```ts
const client = hc<AppType>('/api', {
  headers: {
    Authorization: 'Bearer TOKEN',
  },
})
```

## `init` オプション

fetch の `RequestInit` オブジェクトを `init` オプションとしてリクエストに渡せます。 以下はリクエストを中止する例です。

```ts
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost:8787/')

const abortController = new AbortController()
const res = await client.api.posts.$post(
  {
    json: {
      // Request body
    },
  },
  {
    // RequestInit object
    init: {
      signal: abortController.signal,
    },
  }
)

// ...

abortController.abort()
```

::: info
`init` で定義された `RequestInit` オブジェクトが最も高い優先度を持ちます。 `body | method | headers` などの他のオプションで設定されたものを上書きするために使用できます。
:::

## `$url()`

`$url()` を使うと、エンドポイントにアクセスするための `URL` オブジェクトを取得できます。

::: warning
動作させるためには、絶対 URL を渡さなければなりません。 相対 URL である `/` を渡すと、次のようなエラーになります。

`Uncaught TypeError: Failed to construct 'URL': Invalid URL`

```ts
// ❌ Will throw error
const client = hc<AppType>('/')
client.api.post.$url()

// ✅ Will work as expected
const client = hc<AppType>('http://localhost:8787/')
client.api.post.$url()
```

:::

```ts
const route = app
  .get('/api/posts', (c) => c.json({ posts }))
  .get('/api/posts/:id', (c) => c.json({ post }))

const client = hc<typeof route>('http://localhost:8787/')

let url = client.api.posts.$url()
console.log(url.pathname) // `/api/posts`

url = client.api.posts[':id'].$url({
  param: {
    id: '123',
  },
})
console.log(url.pathname) // `/api/posts/123`
```

### Typed URL

`hc` の第2型パラメータとしてベース URL を渡すと、より正確な URL 型を得られます:

```ts
const client = hc<typeof route, 'http://localhost:8787'>(
  'http://localhost:8787/'
)

const url = client.api.posts.$url()
// url is TypedURL with precise type information
// including protocol, host, and path
```

SWR のようなライブラリで URL を型安全なキーとして使用したい場合に便利です。

## `$path()`

`$path()` は `$url()` と似ていますが、 `URL` オブジェクトの代わりにパス文字列を返します。 `$url()` とは異なりベース URL のオリジンを含まないため、 `hc` に渡すベース URL に関係なく動作します。

```ts
const route = app
  .get('/api/posts', (c) => c.json({ posts }))
  .get('/api/posts/:id', (c) => c.json({ post }))

const client = hc<typeof route>('http://localhost:8787/')

let path = client.api.posts.$path()
console.log(path) // `/api/posts`

path = client.api.posts[':id'].$path({
  param: {
    id: '123',
  },
})
console.log(path) // `/api/posts/123`
```

クエリパラメータも渡せます:

```ts
const path = client.api.posts.$path({
  query: {
    page: '1',
    limit: '10',
  },
})
console.log(path) // `/api/posts?page=1&limit=10`
```

## ファイルアップロード

フォームボディを使ってファイルをアップロードできます:

```ts
// client
const res = await client.user.picture.$put({
  form: {
    file: new File([fileToUpload], filename, {
      type: fileToUpload.type,
    }),
  },
})
```

```ts
// server
const route = app.put(
  '/user/picture',
  zValidator(
    'form',
    z.object({
      file: z.instanceof(File),
    })
  )
  // ...
)
```

## カスタム `fetch` メソッド

カスタム `fetch` メソッドを設定できます。

以下の Cloudflare Worker 向けスクリプトの例では、デフォルトの `fetch` の代わりに Service Bindings の `fetch` メソッドを使用しています。

```toml
# wrangler.toml
services = [
  { binding = "AUTH", service = "auth-service" },
]
```

```ts
// src/client.ts
const client = hc<CreateProfileType>('http://localhost', {
  fetch: c.env.AUTH.fetch.bind(c.env.AUTH),
})
```

## カスタムクエリシリアライザ

`buildSearchParams` オプションを使うと、クエリパラメータのシリアライズ方法をカスタマイズできます。 配列にブラケット記法が必要な場合や、その他のカスタムフォーマットが必要な場合に便利です:

```ts
const client = hc<AppType>('http://localhost', {
  buildSearchParams: (query) => {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) {
        continue
      }
      if (Array.isArray(v)) {
        v.forEach((item) => searchParams.append(`${k}[]`, item))
      } else {
        searchParams.set(k, v)
      }
    }
    return searchParams
  },
})
```

## Infer

`InferRequestType` と `InferResponseType` を使用して、リクエストされるオブジェクトの型と返されるオブジェクトの型を知ることができます。

```ts
import type { InferRequestType, InferResponseType } from 'hono/client'

// InferRequestType
const $post = client.todo.$post
type ReqType = InferRequestType<typeof $post>['form']

// InferResponseType
type ResType = InferResponseType<typeof $post>
```

## 型安全なヘルパーによるレスポンスのパース

`parseResponse()` ヘルパーを使用すると、 `hc` からの Response を型安全に簡単にパースできます。

```ts
import { parseResponse, DetailedError } from 'hono/client'

// result contains the parsed response body (automatically parsed based on Content-Type)
const result = await parseResponse(client.hello.$get()).catch(
  (e: DetailedError) => {
    console.error(e)
  }
)
// parseResponse automatically throws an error if response is not ok
```

## SWR の使用

[SWR](https://swr.vercel.app) のような React Hook ライブラリも使用できます。

```tsx
import useSWR from 'swr'
import { hc } from 'hono/client'
import type { InferRequestType } from 'hono/client'
import type { AppType } from '../functions/api/[[route]]'

const App = () => {
  const client = hc<AppType>('/api')
  const $get = client.hello.$get

  const fetcher =
    (arg: InferRequestType<typeof $get>) => async () => {
      const res = await $get(arg)
      return await res.json()
    }

  const { data, error, isLoading } = useSWR(
    'api-hello',
    fetcher({
      query: {
        name: 'SWR',
      },
    })
  )

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return <h1>{data?.message}</h1>
}

export default App
```

## 大規模アプリケーションでの RPC の使用

[大規模アプリケーションの構築](/docs/guides/best-practices#building-a-larger-application) で述べたような大規模なアプリケーションの場合は、型の推論に注意する必要があります。
簡単な方法は、常に型が推論されるようにハンドラをチェーンすることです。

```ts
// authors.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/', (c) => c.json('list authors'))
  .post('/', (c) => c.json('create an author', 201))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

```ts
// books.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/', (c) => c.json('list books'))
  .post('/', (c) => c.json('create a book', 201))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

その後、通常通りサブルーターをインポートし、それらのハンドラもチェーンしてください。 この場合これがアプリのトップレベルであり、エクスポートしたい型になります。

```ts
// index.ts
import { Hono } from 'hono'
import authors from './authors'
import books from './books'

const app = new Hono()

const routes = app.route('/authors', authors).route('/books', books)

export default app
export type AppType = typeof routes
```

これで、登録された AppType を使用して新しいクライアントを作成し、通常通り使用できます。

## 既知の問題

### IDE のパフォーマンス

RPC を使用する場合、ルートが多くなるほど IDE は遅くなります。 主な原因の1つは、アプリの型を推論するために大量の型インスタンス化が実行されることです。

例えば、アプリに次のようなルートがあるとします:

```ts
// app.ts
export const app = new Hono().get('foo/:id', (c) =>
  c.json({ ok: true }, 200)
)
```

Hono は次のように型を推論します:

```ts
export const app = Hono<BlankEnv, BlankSchema, '/'>().get<
  'foo/:id',
  'foo/:id',
  JSONRespondReturn<{ ok: boolean }, 200>,
  BlankInput,
  BlankEnv
>('foo/:id', (c) => c.json({ ok: true }, 200))
```

これはシングルルートの型インスタンスです。 ユーザは手動でこれらの型引数を記述する必要がない (これはよいことですが) が、一方で型インスタンスは多くの時間を消費することが知られています。 IDE で使用されている `tsserver` は、アプリケーションを使用するたびに、時間のかかる処理をします。 多くのルートがある場合、 IDE は大幅に遅くなる可能性があります。

ただし、この問題を緩和するためのヒントがいくつかあります。

#### Hono のバージョンの不一致

バックエンドがフロントエンドから分離され、別のディレクトリにある場合は、 Hono のバージョンが一致していることを確認する必要があります。 バックエンドとフロントエンドで異なる Hono のバージョンを使用すると、 "_Type instantiation is excessively deep and possibly infinite_" のような問題に遭遇します。

![](https://github.com/user-attachments/assets/e4393c80-29dd-408d-93ab-d55c11ccca05)

#### TypeScript プロジェクト参照

[Hono のバージョンの不一致](#hono-version-mismatch) の場合と同様に、バックエンドとフロントエンドが分離していると問題に遭遇します。 フロントエンドからバックエンドのコード (例えば `AppType`) にアクセスしたい場合は、[プロジェクト参照](https://www.typescriptlang.org/docs/handbook/project-references.html) を使用する必要があります。 TypeScript のプロジェクト参照により、ある TypeScript コードベースが別の TypeScript コードベースのコードにアクセスして使用できるようになります。 _(出典: [Hono RPC And TypeScript Project References](https://catalins.tech/hono-rpc-in-monorepos/))_

#### 使用前にコードをコンパイルする (推奨)

`tsc` は型インスタンス化のような重い処理をコンパイル時に行えます! そうすれば、 `tsserver` は使用するたびにすべての型引数をインスタンス化する必要がありません。 IDE がかなり速くなります!

サーバーアプリを含むクライアントをコンパイルすると、最高のパフォーマンスが得られます。 プロジェクトに次のコードを置いてください:

```ts
import { app } from './app'
import { hc } from 'hono/client'

// this is a trick to calculate the type when compiling
export type Client = ReturnType<typeof hc<typeof app>>

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<typeof app>(...args)
```

コンパイル後、 `hc` の代わりに `hcWithType` を使用することで、型が既に計算済みのクライアントを取得できます。

```ts
const client = hcWithType('http://localhost:8787/')
const res = await client.posts.$post({
  form: {
    title: 'Hello',
    body: 'Hono is a cool project',
  },
})
```

プロジェクトが monorepo であれば、この解決策はよく合います。 [`turborepo`](https://turbo.build/repo/docs) のようなツールを使用すると、サーバープロジェクトとクライアントプロジェクトを簡単に分離でき、それらの間の依存関係を管理する統合性が向上します。 [動作するサンプル](https://github.com/m-shaka/hono-rpc-perf-tips-example) はこちらです。

また、 `concurrently` や `npm-run-all` のようなツールを使って、ビルドプロセスを手動で連携させることもできます。

#### 型引数を手動で指定する

少し面倒ですが、型引数を手動で指定することで型インスタンス化を回避できます。

```ts
const app = new Hono().get<'foo/:id'>('foo/:id', (c) =>
  c.json({ ok: true }, 200)
)
```

たった1つの型引数を指定するだけでもパフォーマンスに違いが出ますが、多くのルートがある場合は多くの時間と労力がかかるかもしれません。

#### アプリとクライアントを複数のファイルに分割する

[大規模アプリケーションでの RPC の使用](#using-rpc-with-larger-applications) で説明したように、アプリを複数のアプリに分割できます。 アプリごとにクライアントを作成することもできます:

```ts
// authors-cli.ts
import { app as authorsApp } from './authors'
import { hc } from 'hono/client'

const authorsClient = hc<typeof authorsApp>('/authors')

// books-cli.ts
import { app as booksApp } from './books'
import { hc } from 'hono/client'

const booksClient = hc<typeof booksApp>('/books')
```

このようにすることで、 `tsserver` はすべてのルートの型を一度にインスタンス化する必要がなくなります。

### Handlers that return a promise chain

A handler that returns a `.then()` chain directly loses its response type, so the client infers `unknown`:

```ts
const app = new Hono().get('/', (c) =>
  Promise.resolve({ hello: 'world' }).then((d) => c.json(d))
)

const client = hc<typeof app>('')
const res = await client.index.$get()
const data = await res.json() // unknown
```

This is a TypeScript inference limitation — the response type cannot be inferred through a `.then()` chain. Use `async`/`await` instead:

```ts
const app = new Hono().get('/', async (c) => {
  const d = await Promise.resolve({ hello: 'world' })
  return c.json(d)
})

const client = hc<typeof app>('')
const res = await client.index.$get()
const data = await res.json() // { hello: string }
```

If you cannot avoid the chain, annotating `then()` also works:

```ts
import type { TypedResponse } from 'hono/types'

const app = new Hono().get('/', (c) =>
  Promise.resolve({ hello: 'world' }).then<
    TypedResponse<{ hello: string }, 200, 'json'>
  >((d) => c.json(d, 200))
)
```
