# JSX

`hono/jsx` で、 HTML を JSX 構文で書くことができます。

`hono/jsx` はクライアントでも動作しますが、サーバー側でコンテンツをレンダリングするとき最も頻繁に使うことになるでしょう。 ここでは、サーバーとクライアントの両方に共通する、 JSX に関するいくつかのことを説明します。

## 設定

JSX を使うために `tsconfig.json` を変更します:

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

あるいは、プラグマを使用します:

```ts
/** @jsx jsx */
/** @jsxImportSource hono/jsx */
```

Deno では、`tsconfig.json` の代わりに `deno.json` を変更しなければなりません:

```json
{
  "compilerOptions": {
    "jsx": "precompile",
    "jsxImportSource": "@hono/hono/jsx"
  }
}
```

## 使い方

:::info
[Quick Start](/docs/#quick-start) から直接来られている場合、メインファイルは `.ts` という拡張子をもっています - これを `.tsx` に変える必要があります - そうしないとアプリケーションを実行できないでしょう。さらに変更を反映するために `package.json` (あるいは Deno を使用しているなら `deno.json` )を変更するべきです。(たとえば、dev スクリプトを `bun run --hot src/index.ts` とする代わりに、`bun run --hot src/index.tsx` とすべきです)
:::

`index.tsx`:

```tsx
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const app = new Hono()

const Layout: FC = (props) => {
  return (
    <html>
      <body>{props.children}</body>
    </html>
  )
}

const Top: FC<{ messages: string[] }> = (props: {
  messages: string[]
}) => {
  return (
    <Layout>
      <h1>Hello Hono!</h1>
      <ul>
        {props.messages.map((message) => {
          return <li>{message}!!</li>
        })}
      </ul>
    </Layout>
  )
}

app.get('/', (c) => {
  const messages = ['Good Morning', 'Good Evening', 'Good Night']
  return c.html(<Top messages={messages} />)
})

export default app
```

## メタデータの巻き上げ

コンポーネント内に直接 `<title>`, `<link>`, `<meta>` などのドキュメントメタデータタグを記述することができます。これらのタグは、ドキュメントの `<head>` セクションに自動的に巻き上げられます。`<head>` 要素が適切なメタデータを決定するコンポーネントから描画されるときに特に有用です。

```tsx
import { Hono } from 'hono'

const app = new Hono()

app.use('*', async (c, next) => {
  c.setRenderer((content) => {
    return c.html(
      <html>
        <head></head>
        <body>{content}</body>
      </html>
    )
  })
  await next()
})

app.get('/about', (c) => {
  return c.render(
    <>
      <title>About Page</title>
      <meta name='description' content='This is the about page.' />
      about page content
    </>
  )
})

export default app
```

:::info
巻き上げが起こるとき、既存の要素は削除されません。後に現れる要素は最後に追加されます。たとえば、`<head>` に `<title>Default</title>` があり、コンポーネントが `<title>Page Title</title>` を描画する場合、両方のタイトルがヘッダに現れます。
:::

## フラグメント

フラグメントを使用して、複数の要素を追加ノード無しでグループ化します:

```tsx
import { Fragment } from 'hono/jsx'

const List = () => (
  <Fragment>
    <p>first child</p>
    <p>second child</p>
    <p>third child</p>
  </Fragment>
)
```

きちんと設定されていれば、 `<></>` を使って書くこともできます。

```tsx
const List = () => (
  <>
    <p>first child</p>
    <p>second child</p>
    <p>third child</p>
  </>
)
```

## `PropsWithChildren`

`PropsWithChildren` を使用すると、関数コンポーネント内の子要素を正しく推論できます。

```tsx
import { PropsWithChildren } from 'hono/jsx'

type Post = {
  id: number
  title: string
}

function Component({ title, children }: PropsWithChildren<Post>) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}
```

## 生 HTML の挿入

直接 HTML を挿入するには、 `dangerouslySetInnerHTML` を使用します:

```tsx
app.get('/foo', (c) => {
  const inner = { __html: 'JSX &middot; SSR' }
  const Div = <div dangerouslySetInnerHTML={inner} />
})
```

## メモ

`memo` を使用して、計算済みの文字列を保存することでコンポーネントを最適化します:

```tsx
import { memo } from 'hono/jsx'

const Header = memo(() => <header>Welcome to Hono</header>)
const Footer = memo(() => <footer>Powered by Hono</footer>)
const Layout = (
  <div>
    <Header />
    <p>Hono is cool!</p>
    <Footer />
  </div>
)
```

## Context

`useContext` を使用することで、プロパティを通して値を渡したりせずに、コンポーネントツリーのあらゆるレベルに渡ってデータをグローバルに共有することができます。

```tsx
import type { FC } from 'hono/jsx'
import { createContext, useContext } from 'hono/jsx'

const themes = {
  light: {
    color: '#000000',
    background: '#eeeeee',
  },
  dark: {
    color: '#ffffff',
    background: '#222222',
  },
}

const ThemeContext = createContext(themes.light)

const Button: FC = () => {
  const theme = useContext(ThemeContext)
  return <button style={theme}>Push!</button>
}

const Toolbar: FC = () => {
  return (
    <div>
      <Button />
    </div>
  )
}

// ...

app.get('/', (c) => {
  return c.html(
    <div>
      <ThemeContext.Provider value={themes.dark}>
        <Toolbar />
      </ThemeContext.Provider>
    </div>
  )
})
```

## Async コンポーネント

`hono/jsx` は、Async コンポーネントをサポートしているため、コンポーネント内で `async`/`await` を使用できます。
`c.html()` を使って描画する場合、自動的に await されます。

```tsx
const AsyncComponent = async () => {
  await new Promise((r) => setTimeout(r, 1000)) // sleep 1s
  return <div>Done!</div>
}

app.get('/', (c) => {
  return c.html(
    <html>
      <body>
        <AsyncComponent />
      </body>
    </html>
  )
})
```

## Suspense <Badge style="vertical-align: middle;" type="warning" text="Experimental" />

React と同じような `Suspense` 機能が使用できます。
`Suspense` を使って async コンポーネントをラップすると、fallback 内のコンテンツが最初に描画されます。一旦 Promise が resolve になると、await されたコンテンツが描画されます。
`renderToReadableStream()` メソッドで使用できます。

```tsx
import { renderToReadableStream, Suspense } from 'hono/jsx/streaming'

//...

app.get('/', (c) => {
  const stream = renderToReadableStream(
    <html>
      <body>
        <Suspense fallback={<div>loading...</div>}>
          <Component />
        </Suspense>
      </body>
    </html>
  )
  return c.body(stream, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Transfer-Encoding': 'chunked',
    },
  })
})
```

## ErrorBoundary <Badge style="vertical-align: middle;" type="warning" text="Experimental" />

`ErrorBoundary` を使用して子コンポーネントでエラーをキャッチすることができます。

以下の例では、エラーが発生した場合に、`fallback` で指定されたコンテンツを表示します。

```tsx
function SyncComponent() {
  throw new Error('Error')
  return <div>Hello</div>
}

app.get('/sync', async (c) => {
  return c.html(
    <html>
      <body>
        <ErrorBoundary fallback={<div>Out of Service</div>}>
          <SyncComponent />
        </ErrorBoundary>
      </body>
    </html>
  )
})
```

`ErrorBoundary` を async コンポーネントや `Suspense` で使用することもできます。

```tsx
async function AsyncComponent() {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  throw new Error('Error')
  return <div>Hello</div>
}

app.get('/with-suspense', async (c) => {
  return c.html(
    <html>
      <body>
        <ErrorBoundary fallback={<div>Out of Service</div>}>
          <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
})
```

## StreamingContext <Badge style="vertical-align: middle;" type="warning" text="Experimental" />

`Suspense` や `ErrorBoundary` のようなストリーミングコンポーネントの設定を提供する `StreamingContext` を使用することができます。コンテンツセキュリティポリシー (CSP) のためにこれらのコンポーネントによって生成されるスクリプトタグに使い捨ての値を追加するのに有用です。

```tsx
import { Suspense, StreamingContext } from 'hono/jsx/streaming'

// ...

app.get('/', (c) => {
  const stream = renderToReadableStream(
    <html>
      <body>
        <StreamingContext
          value={{ scriptNonce: 'random-nonce-value' }}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        </StreamingContext>
      </body>
    </html>
  )

  return c.body(stream, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Transfer-Encoding': 'chunked',
      'Content-Security-Policy':
        "script-src 'nonce-random-nonce-value'",
    },
  })
})
```

`scriptNonce` の値は、自動的に `Suspense` や `ErrorBoundary` で生成されたすべての `<script>` タグに追加されます。

## html ミドルウェアと統合

強力なテンプレートとして JSX と HTML ミドルウェアを結合します。
詳細については、[HTML ミドルウェア ドキュメント](/docs/helpers/html) を参照してください。

```tsx
import { Hono } from 'hono'
import { html } from 'hono/html'

const app = new Hono()

interface SiteData {
  title: string
  children?: any
}

const Layout = (props: SiteData) =>
  html`<!doctype html>
    <html>
      <head>
        <title>${props.title}</title>
      </head>
      <body>
        ${props.children}
      </body>
    </html>`

const Content = (props: { siteData: SiteData; name: string }) => (
  <Layout {...props.siteData}>
    <h1>Hello {props.name}</h1>
  </Layout>
)

app.get('/:name', (c) => {
  const { name } = c.req.param()
  const props = {
    name: name,
    siteData: {
      title: 'JSX with html sample',
    },
  }
  return c.html(<Content {...props} />)
})

export default app
```

## JSX レンダラミドルウェアと一緒に使用する

[JSX Renderer Middleware](/docs/middleware/builtin/jsx-renderer) を使用すると、JSX でより簡単に HTML ページを生成することができます。

## 型定義をオーバーライドする

カスタム要素や属性を追加するために、型定義をオーバーライドすることができます。

```ts
declare module 'hono/jsx' {
  namespace JSX {
    interface IntrinsicElements {
      'my-custom-element': HTMLAttributes & {
        'x-event'?: 'click' | 'scroll'
      }
    }
  }
}
```
