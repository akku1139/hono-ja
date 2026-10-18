# Mount ミドルウェア

Mount ミドルウェアは、 別のフレームワークでビルドされたアプリケーションを自身の Hono アプリケーションへマウントさせます。

## Import

```ts twoslash
import { Hono } from 'hono'
import { mount } from 'hono/mount'
```

## 使い方

`app.all()` を使用して `/*` で終わるパスに対してミドルウェアを登録します:

```ts
import { Router as IttyRouter } from 'itty-router'

// itty-router アプリケーションを生成
const ittyRouter = IttyRouter()

// `GET /itty-router/hello` を処理
ittyRouter.get('/hello', () => new Response('Hello from itty-router'))

const app = new Hono()

app.all('/itty-router/*', mount(ittyRouter.handle))
```

デフォルトでは、 マウントされたアプリケーションは、 URL からプレフィクスが削除されたパスを持った新しい `Request` オブジェクトを受け取ります。 `/itty-router/hello` へのリクエストは、 `/hello` として itty-router へ渡されます。

マウントされたアプリケーションは、 `handler(request, c.env, c.executionCtx)` のようにコールされます。 Cloudflare Workers `fetch` ハンドラと同じ引数です。 別の引数を渡すには `optionHandler` を使用します。

## オプション

第 2 引数として関数やオブジェクトを渡すことができます。

### <Badge type="info" text="optional" /> optionHandler: `(c: Context) => unknown`

`Request` の後にマウントされたアプリケーションに渡した引数を返します。 配列は複数の引数に展開され、 第 2 引数として直接関数を渡すことができます:

```ts twoslash
import { Hono } from 'hono'
import { mount } from 'hono/mount'
const app = new Hono()
const anotherApp = (request: Request, ...args: unknown[]) =>
  new Response(request.url)
// ---cut---
// `anotherApp(request, c.env)` をコール
app.all(
  '/app/*',
  mount(anotherApp, (c) => c.env)
)

// `anotherApp(request, c.env, c.executionCtx)` をコール
app.all(
  '/app/*',
  mount(anotherApp, {
    optionHandler: (c) => [c.env, c.executionCtx],
  })
)
```

### <Badge type="info" text="optional" /> replaceRequest: `((originalRequest: Request) => Request) | false`

どの `Request` がマウントされたアプリケーションに渡されたのかを制御します:

```ts twoslash
import { Hono } from 'hono'
import { mount } from 'hono/mount'
const app = new Hono()
const anotherApp = (request: Request, ...args: unknown[]) =>
  new Response(request.url)
// ---cut---
// `/legacy/users` は `/api/users` としてマウントされたアプリケーションに届きます
app.all(
  '/legacy/*',
  mount(anotherApp, {
    replaceRequest: (req) => {
      const url = new URL(req.url)
      url.pathname = url.pathname.replace(/^\/legacy/, '/api')
      return new Request(url, req)
    },
  })
)
```

変更されていない元の `Request` を渡す際に、 `(req) => req` を簡略化するために `false` をセットします:

```ts twoslash
import { Hono } from 'hono'
import { mount } from 'hono/mount'
const app = new Hono()
const anotherApp = (request: Request, ...args: unknown[]) =>
  new Response(request.url)
// ---cut---
app.all(
  '/app/*',
  mount(anotherApp, {
    replaceRequest: false,
  })
)
```
