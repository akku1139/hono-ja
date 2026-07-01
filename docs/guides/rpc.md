# RPC

RPC 機能を使用すると、サーバとクライアント間で API の仕様を共有することができます。

まず、サーバのコードから Hono アプリケーション (一般的には `AppType` と呼ばれます) - またはクライアントで利用したいルート - を `typeof` したものをエクスポートします。

ジェネリック引数として `AppType` を受け取ることで、 Hono クライアントは、バリデータで指定された入力の型と `c.json()` を使ってハンドラが返した出力の型の両方を推論することができます。

> [!NOTE]
RPC の型が monorepo で適切に動作するには、クライアントとサーバ両方の tsconfig.json ファイル内で、 `compilerOptions` に `"strict": true` を設定します。 [詳細はこちら](https://github.com/honojs/hono/issues/2270#issuecomment-2143745118)

## サーバ

サーバ側でしなければならないことはバリデータを記述することで、変数 `route` を生成します。次のサンプルでは [Zod Validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator) を使用します。

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

// このリクエストは、セットしたあらゆるクッキーを含んでいます
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

## グローバルレスポンス

Hono の RPC クライアントは、`app.onError()` や グローバルミドルウェアのようなグローバルのエラーハンドラから、自動的にレスポンスの型を推論しません。 全てのルートにグローバルなエラーレスポンス型をマージするために `ApplyGlobalResponse` 型ヘルパーを使用することができます。

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

クライアントは成功時とエラー時のレスポンス両方について知っています:

```ts
const res = await client.api.users.$get()

if (res.ok) {
  const data = await res.json() // { users: string[] }
}

// InferResponseType はグローバルエラー型を含んでいます
type ResType = InferResponseType<typeof client.api.users.$get>
// { users: string[] } | { error: string }
```

一度で複数のグローバルエラーステータスコードを定義することもできます:

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

クライアントを使用したい場合、 Not Found レスポンスを返すのに `c.notFound()` を使用すべきではありません。クライアントがサーバから取得するデータは、正しく推論することができません。

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

`c.json()` を使用して、Not Found レスポンスとしてステータスコードを指定してください。

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

あるいは、 `NotFoundResponse` インタフェースを継承したモジュール拡張を使用することができます。 これを使用すると、 `c.notFound()` が型レスポンスを返すことができます:

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

クライアントは、 404 レスポンス型を正しく推論します。

## パスパラメータ

パスパラメータやクエリ値を含んだルートを処理することもできます。

```ts
const route = app.get(
  '/posts/:id',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().optional(), // 強制的に数値に変換
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

たとえ元の値が異なる型であったとしても、パスパラメータやクエリ値はどちらも、 `string` として渡さ**なければなりません**。

`param` でパスに含ませたい文字列を、 `query` でクエリ値として含ませたい文字列を指定します。

```ts
const res = await client.posts[':id'].$get({
  param: {
    id: '123',
  },
  query: {
    page: '1', // `string` だがバリデータで `number` に変換される
  },
})
```

### 複数パラメータ

複数パラメータを使ってルートを処理します。

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

パスにパラメータを指定するために複数の `['']` を追加します。

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

`hc` 関数は `param` の値を URL エンコードしません。パラメータにスラッシュを含めるには、[正規表現](/docs/api/routing#regexp)を使用します。

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
正規表現を使用しない基本的なパスパラメータは、スラッシュにマッチしません。 hc 関数を使用してスラッシュを含む `param` を渡す場合、サーバは意図したようにはルート処理しないかもしれません。正確なルート処理を強制するためには、 `encodeURIComponent` を使用してパラメータをエンコードすることが推奨されます。

## ヘッダ

リクエストにヘッダを追加することができます。

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

全てのリクエストに共通のヘッダを追加するには、 `hc` 関数の引数に指定します。

```ts
const client = hc<AppType>('/api', {
  headers: {
    Authorization: 'Bearer TOKEN',
  },
})
```

## `init` オプション

`init` オプションとしてリクエストに fetch の `RequestInit` オブジェクトを渡すことができます。 以下はリクエストを中止する例です。

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
`init` で定義される `RequestInit` オブジェクトは最高の優先度があります。 `body | method | headers` のような他のオプションでセットされる内容をオーバーライドするために使用されます。
:::

## `$url()`

`$url()` を使用してエンドポイントにアクセスするための `URL` オブジェクトを取得できます。

::: warning
動作させるためには、絶対 URL を渡さなければなりません。 相対 URLである  `/` を渡すと、次のようなエラーになります。

`Uncaught TypeError: Failed to construct 'URL': Invalid URL`

```ts
// ❌ エラーをスローするでしょう
const client = hc<AppType>('/')
client.api.post.$url()

// ✅ 期待通りに動作するでしょう
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

### 型安全な URL

より正確な URL の型を取得するために、 `hc` に2 つ目の型引数としてベース URL を渡すことができます:

```ts
const client = hc<typeof route, 'http://localhost:8787'>(
  'http://localhost:8787/'
)

const url = client.api.posts.$url()
// url は正確な型情報(プロトコル, ホスト, パスを含む)
// をもった型安全な URL です
```

SWR のようなライブラリに対して型安全なキーとして URL を使用したいときに有用です。

## `$path()`

`$path()` は `$url()` と同じですが、 `URL` オブジェクトの代わりにパス文字列を返します。 `$url()` とは違って、ベース URL オリジンを含みません。 そのため、`hc` に渡すベース URL に関係なく動作します。

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

クエリパラメータも渡すことができます:

```ts
const path = client.api.posts.$path({
  query: {
    page: '1',
    limit: '10',
  },
})
console.log(path) // `/api/posts?page=1&limit=10`
```

## ファイルのアップロード

フォームのボディを使用してファイルをアップロードできます:

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

カスタム `fetch` メソッドをセットすることができます。

以下の Cloudflare Worker 用のサンプルスクリプトでは、サービスにバインドされた `fetch` メソッドがデフォルトの `fetch` の代わりに使用されています。

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

`buildSearchParams` オプションを使用して、クエリパラメータがどのようにシリアライズされるかをカスタマイズすることができます。 配列や他のカスタム形式用にブラケット記法が必要なときに有用です:

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

## 推論

リクエストされたオブジェクトの型や返されるオブジェクトの型を知るために `InferRequestType` や `InferResponseType` を使用します。

```ts
import type { InferRequestType, InferResponseType } from 'hono/client'

// InferRequestType
const $post = client.todo.$post
type ReqType = InferRequestType<typeof $post>['form']

// InferResponseType
type ResType = InferResponseType<typeof $post>
```

## 型安全なヘルパーを使用してレスポンスを解析する

型安全に `hc` からのレスポンスを簡単に解析するために `parseResponse()` ヘルパーを使用できます。

```ts
import { parseResponse, DetailedError } from 'hono/client'

// result は解析されたレスポンスボディ (Content-Type に基づいて自動的に解析されます) を含みます
const result = await parseResponse(client.hello.$get()).catch(
  (e: DetailedError) => {
    console.error(e)
  }
)
// レスポンスが OK でない場合、 parseResponse は自動的にエラーをスローします
```

## SWR を使用する

[SWR](https://swr.vercel.app) のような React のフックライブラリを使用することもできます。

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

## より大規模なアプリケーションで RPC を使用する

より大規模なアプリケーションでは、 [Building a larger application](/docs/guides/best-practices#building-a-larger-application) で述べられている例のように、推論結果の型に注意が必要です。
このための簡単な方法は、ハンドラをチェーンすることです。 そうすることで型が常に推論されます。

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

通常通りに、サブルータをインポートすることができます。 ハンドラをチェーンしていることを確認します。 この場合、アプリケーションのトップレベルなので、エクスポートしたい型になります。

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

登録された AppType を使用して新しいクライアントを生成することができます。 普通にそのクライアントを使用します。

## 既知の問題

### IDE のパフォーマンス

RPC を使用する際に、より多くのルートがあると、 IDE はより遅くなります。 主な理由の一つは、アプリケーションの型を推論するために大量の型インスタンスが実行されるためです

たとえば、次のようなルートを持っているとします:

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

これはシングルルートの型インスタンスです。 ユーザは手動でこれらの型引数を記述する必要がない（これはよいことですが）、一方で型インスタンスは多くの時間を消費することが知られています。 IDE で使用されている `tsserver` は、アプリケーションを使用するたびに、時間のかかる処理をします。 多くのルートがある場合、 IDE は大幅に遅くなる可能性があります。

しかし、この問題を軽減するためのいくつかのヒントがあります

#### Hono のバージョンのミスマッチ

バックエンドがフロントエンドと分割されており、それぞれが異なるディレクトリにある場合、 Hono のバージョンがマッチしていることを確認する必要があります。 バックエンドでは Hono はあるバージョンを使用していて、フロントエンドでは別のバージョンを使用している場合、_型インスタンスが極端に深く無限にループする_ という問題に直面します。

![](https://github.com/user-attachments/assets/e4393c80-29dd-408d-93ab-d55c11ccca05)

#### TypeScript のプロジェクト参照

[Hono のバージョンのミスマッチ](#hono-version-mismatch) のケースと同様に、バックエンドとフロントエンドが分割されている場合に起きる問題に直面します。 バックエンド (たとえば `AppType`) からフロントエンド上のコードにアクセスしたい場合、[プロジェクト参照](https://www.typescriptlang.org/docs/handbook/project-references.html) を使用する必要があります。 TypeScript のプロジェクト参照を使用すると、ある TypeScript のコードが、別の TypeScript のコードにアクセスしたり、使用したりすることができます。 _(ソース: [Hono RPC と TypeScript のプロジェクト参照](https://catalins.tech/hono-rpc-in-monorepos/))_

#### 事前にコンパイルする (推奨)

`tsc` は、コンパイル時に型インスタンスのような重いタスクを処理することができます。 `tsserver` は、使用するたび毎にすべての型引数をインスタンス化する必要がありません。 このように IDE はかなり速くなります!

サーバアプリケーションを含むクライアントをコンパイルすることは、ベストパフォーマンスを与えてくれます。 プロジェクトで次のコードを記述します:

```ts
import { app } from './app'
import { hc } from 'hono/client'

// これは、コンパイル時に型を計算するためのトリックです。
export type Client = ReturnType<typeof hc<typeof app>>

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<typeof app>(...args)
```

コンパイル後、すでに計算された型をクライアントが取得するために `hc` の代わりに `hcWithType` を使用することができます。

```ts
const client = hcWithType('http://localhost:8787/')
const res = await client.posts.$post({
  form: {
    title: 'Hello',
    body: 'Hono is a cool project',
  },
})
```

プロジェクトが ノリポである場合、このソリューションはよくフィットします。 [`turborepo`](https://turbo.build/repo/docs) のようなツールを使用すると、サーバプロジェクトとクライアントプロジェクトを簡単に分割することができ、両者の間の依存関係を管理する面でよりよい結合を得ることができます。 ここに、[動作するサンプル](https://github.com/m-shaka/hono-rpc-perf-tips-example)があります。

`concurrently` や `npm-run-all` のようなツールを使うことで手動でビルドプロセスの調和を取ることもできます。

#### 手動で型引数を指定する

これはかなりやっかいですが、型インスタンス化を避けるために手動で型引数を指定することができます。

```ts
const app = new Hono().get<'foo/:id'>('foo/:id', (c) =>
  c.json({ ok: true }, 200)
)
```

たくさんのルートがある場合に多くの時間と労力がかかる一方で、単一の型引数だけを指定することで、パフォーマンスに違いがあります。

#### アプリケーションとクライアントを複数のファイルに分割する

[より大規模なアプリケーションで RPC を使用する](#using-rpc-with-larger-applications) に記述されているように、アプリケーションを複数のアプリケーションに分割することができます。 それぞれのアプリケーション毎にクライアントを生成することができます:

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

このように `tsserver` は、同時にすべてのルートの型をインスタンス化する必要はありません。
