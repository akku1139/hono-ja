# JSX Renderer ミドルウェア

JSX Renderer Middleware は、 `c.setRenderer()` を使うことなく、 `c.render()` 関数で JSX をレンダリングする際のレイアウトを設定できるようにします。 さらに、 `useRequestContext()` を使用して、コンポーネント内の Context のインスタンスにアクセスできるようにします。

## Import

```ts
import { Hono } from 'hono'
import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer'
```

## 使い方

```jsx
const app = new Hono()

app.get(
  '/page/*',
  jsxRenderer(({ children }) => {
    return (
      <html>
        <body>
          <header>Menu</header>
          <div>{children}</div>
        </body>
      </html>
    )
  })
)

app.get('/page/about', (c) => {
  return c.render(<h1>About me!</h1>)
})
```

## オプション

### <Badge type="info" text="optional" /> docType: `boolean` | `string`

HTML の先頭に DOCTYPE を追加したくない場合は、 `docType` オプションを `false` に設定してください。

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>{children}</body>
        </html>
      )
    },
    { docType: false }
  )
)
```

また、 DOCTYPE を指定することもできます。

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>{children}</body>
        </html>
      )
    },
    {
      docType:
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
    }
  )
)
```

### <Badge type="info" text="optional" /> stream: `boolean` | `Record<string, string>`

`true` を設定するか Record 値を指定すると、ストリーミングレスポンスとしてレンダリングされます。

```tsx
const AsyncComponent = async () => {
  await new Promise((r) => setTimeout(r, 1000)) // sleep 1s
  return <div>Hi!</div>
}

app.get(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>
            <h1>SSR Streaming</h1>
            {children}
          </body>
        </html>
      )
    },
    { stream: true }
  )
)

app.get('/', (c) => {
  return c.render(
    <Suspense fallback={<div>loading...</div>}>
      <AsyncComponent />
    </Suspense>
  )
})
```

`true` を設定すると、次のヘッダーが追加されます:

```ts
{
  'Transfer-Encoding': 'chunked',
  'Content-Type': 'text/html; charset=UTF-8',
  'Content-Encoding': 'Identity'
}
```

Record 値を指定することで、ヘッダー値をカスタマイズできます。

### Function-based Options

静的なオプションオブジェクトの代わりに、 `Context` オブジェクトを受け取る関数を渡せます。 これにより、環境変数やリクエストパラメータなど、リクエストコンテキストに基づいてオプションを動的に設定できます。

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <html>
          <body>{children}</body>
        </html>
      )
    },
    (c) => ({
      stream: c.req.header('X-Enable-Streaming') === 'true',
    })
  )
)
```

具体的な例として、 [`isSSGContext`](/docs/helpers/ssg#isssgcontext) ヘルパーを使用して、 `<Suspense>` で静的サイト (SSG) を生成する際にストリーミングを無効化できます:

```tsx
app.use(
  '*',
  jsxRenderer(
    ({ children }) => {
      return (
        <div>
          <Suspense fallback={'loading...'}>
            <Component />
          </Suspense>
        </div>
      )
    },
    (c) => ({
      stream: !isSSGContext(c),
    })
  )
)
```

## ネストされたレイアウト

`Layout` コンポーネントにより、レイアウトをネストできます。

```tsx
app.use(
  jsxRenderer(({ children }) => {
    return (
      <html>
        <body>{children}</body>
      </html>
    )
  })
)

const blog = new Hono()
blog.use(
  jsxRenderer(({ children, Layout }) => {
    return (
      <Layout>
        <nav>Blog Menu</nav>
        <div>{children}</div>
      </Layout>
    )
  })
)

app.route('/blog', blog)
```

## `useRequestContext()`

`useRequestContext()` は Context のインスタンスを返します。

```tsx
import { useRequestContext, jsxRenderer } from 'hono/jsx-renderer'

const app = new Hono()
app.use(jsxRenderer())

const RequestUrlBadge: FC = () => {
  const c = useRequestContext()
  return <b>{c.req.url}</b>
}

app.get('/page/info', (c) => {
  return c.render(
    <div>
      You are accessing: <RequestUrlBadge />
    </div>
  )
})
```

::: warning
Deno の `precompile` JSX オプションでは `useRequestContext()` を使用できません。 `react-jsx` を使用してください:

```json
   "compilerOptions": {
     "jsx": "precompile", // [!code --]
     "jsx": "react-jsx", // [!code ++]
     "jsxImportSource": "hono/jsx"
   }
 }
```

:::

## `ContextRenderer` の拡張

以下のように `ContextRenderer` を定義すると、レンダラーに追加のコンテンツを渡せます。 これは例えば、ページごとに head タグの中身を変更したい場合に便利です。

```tsx
declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: { title: string }
    ): Response
  }
}

const app = new Hono()

app.get(
  '/page/*',
  jsxRenderer(({ children, title }) => {
    return (
      <html>
        <head>
          <title>{title}</title>
        </head>
        <body>
          <header>Menu</header>
          <div>{children}</div>
        </body>
      </html>
    )
  })
)

app.get('/page/favorites', (c) => {
  return c.render(
    <div>
      <ul>
        <li>Eating sushi</li>
        <li>Watching baseball games</li>
      </ul>
    </div>,
    {
      title: 'My favorites',
    }
  )
})
```
