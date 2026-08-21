# HTML ヘルパー

HTML Helper を使うと、 `html` というタグ付きテンプレートで JavaScript のテンプレートリテラル内に HTML を書けます。 `raw()` を使うと、コンテンツはそのままレンダリングされます。 これらの文字列は自分でエスケープする必要があります。

## Import

```ts
import { Hono } from 'hono'
import { html, raw } from 'hono/html'
```

## `html`

```ts
const app = new Hono()

app.get('/:username', (c) => {
  const { username } = c.req.param()
  return c.html(
    html`<!doctype html>
      <h1>Hello! ${username}!</h1>`
  )
})
```

### JSX へのスニペット挿入

インラインスクリプトを JSX に挿入します:

```tsx
app.get('/', (c) => {
  return c.html(
    <html>
      <head>
        <title>Test Site</title>
        {html`
          <script>
            // No need to use dangerouslySetInnerHTML.
            // If you write it here, it will not be escaped.
          </script>
        `}
      </head>
      <body>Hello!</body>
    </html>
  )
})
```

### 関数コンポーネントとして動作

`html` は HtmlEscapedString を返すので、 JSX を使わずとも完全に機能するコンポーネントとして動作できます。

#### `memo` の代わりに `html` を使って処理を高速化する

```typescript
const Footer = () => html`
  <footer>
    <address>My Address...</address>
  </footer>
`
```

### props の受け取りと値の埋め込み

```typescript
interface SiteData {
  title: string
  description: string
  image: string
  children?: any
}
const Layout = (props: SiteData) => html`
<html>
<head>
  <meta charset="UTF-8">
  <title>${props.title}</title>
  <meta name="description" content="${props.description}">
  <head prefix="og: http://ogp.me/ns#">
  <meta property="og:type" content="article">
  <!-- More elements slow down JSX, but not template literals. -->
  <meta property="og:title" content="${props.title}">
  <meta property="og:image" content="${props.image}">
</head>
<body>
  ${props.children}
</body>
</html>
`

const Content = (props: { siteData: SiteData; name: string }) => (
  <Layout {...props.siteData}>
    <h1>Hello {props.name}</h1>
  </Layout>
)

app.get('/', (c) => {
  const props = {
    name: 'World',
    siteData: {
      title: 'Hello <> World',
      description: 'This is a description',
      image: 'https://example.com/image.png',
    },
  }
  return c.html(<Content {...props} />)
})
```

## `raw()`

```ts
app.get('/', (c) => {
  const name = 'John &quot;Johnny&quot; Smith'
  return c.html(html`<p>I'm ${raw(name)}.</p>`)
})
```

## Tips

これらのライブラリのおかげで、 Visual Studio Code や vim もテンプレートリテラルを HTML として解釈し、シンタックスハイライトやフォーマットを適用できます。

- <https://marketplace.visualstudio.com/items?itemName=bierner.lit-html>
- <https://github.com/MaxMEllon/vim-jsx-pretty>
