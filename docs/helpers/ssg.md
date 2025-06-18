# SSG ヘルパー

SSG ヘルパーは Hono アプリケーションから静的サイトを作成します。 登録されたルートのコンテンツを取得し、静的なファイルとして保存します。

## 使い方

### 手動

このようなシンプルな Hono のアプリケーションがある時:

```tsx
// index.tsx
const app = new Hono()

app.get('/', (c) => c.html('Hello, World!'))
app.use('/about', async (c, next) => {
  c.setRenderer((content, head) => {
    return c.html(
      <html>
        <head>
          <title>{head.title ?? ''}</title>
        </head>
        <body>
          <p>{content}</p>
        </body>
      </html>
    )
  })
  await next()
})
app.get('/about', (c) => {
  return c.render('Hello!', { title: 'Hono SSG Page' })
})

export default app
```

Node.js では、このようなビルドスクリプトを書きます:

```ts
// build.ts
import app from './index'
import { toSSG } from 'hono/ssg'
import fs from 'fs/promises'

toSSG(app, fs)
```

スクリプトを実行して、ファイルが出力されます:

```bash
ls ./static
about.html  index.html
```

### Vite プラグイン

Vite プラグインである `@hono/vite-ssg` を使うと、簡単に処理を行うことができます。

詳しくは、以下のページを御覧ください:

https://github.com/honojs/vite-plugins/tree/main/packages/ssg

## toSSG

`toSSG` は静的サイトを作成するために使うメイン関数で、アプリケーションとファイルシステムモジュールを引数として受け取ります。 詳しくはこのようなものです:

### 入力

toSSG の引数は ToSSGInterface です。

```ts
export interface ToSSGInterface {
  (
    app: Hono,
    fsModule: FileSystemModule,
    options?: ToSSGOptions
  ): Promise<ToSSGResult>
}
```

- `app` には、ルートを登録した `new Hono()` を指定します。
- `fs` には、 `node:fs/promise` のようなオブジェクトを指定します。

```ts
export interface FileSystemModule {
  writeFile(path: string, data: string | Uint8Array): Promise<void>
  mkdir(
    path: string,
    options: { recursive: boolean }
  ): Promise<void | string>
}
```

### Deno や Bun でアダプタを使用する

Deno や Bun で SSG を行いたい場合、それぞれのファイルシステム API 用に `toSSG` 関数が用意されています。

Deno:

```ts
import { toSSG } from 'hono/deno'

toSSG(app) // The second argument is an option typed `ToSSGOptions`.
```

Bun:

```ts
import { toSSG } from 'hono/bun'

toSSG(app) // The second argument is an option typed `ToSSGOptions`.
```

### オプション

オプションは ToSSGOptions インターフェースで指定されます。

```ts
export interface ToSSGOptions {
  dir?: string
  concurrency?: number
  beforeRequestHook?: BeforeRequestHook
  afterResponseHook?: AfterResponseHook
  afterGenerateHook?: AfterGenerateHook
  extensionMap?: Record<string, string>
  plugins?: SSGPlugin[]
}
```

- `dir` は静的サイトの出力先です。 デフォルトは `./static` です。
- `concurrency` は同時に処理・出力されるファイルの数です。 デフォルトは `2` です。
- `extensionMap` は `Content-Type` を key に、拡張子の文字列を value に持つオブジェクトです。 出力するファイルの拡張子を決めるために使われます。
- `plugins` は静的サイトジェネレータの機能を拡張する SSG プラグインの配列です。

それぞれのフックとプラグインについては後で解説します。

### 出力

`toSSG` はこのような型の戻り値を返します。

```ts
export interface ToSSGResult {
  success: boolean
  files: string[]
  error?: Error
}
```

## フック

オプションでフックを設定することで `toSSG` の処理をカスタマイズできます。

```ts
export type BeforeRequestHook = (req: Request) => Request | false
export type AfterResponseHook = (res: Response) => Response | false
export type AfterGenerateHook = (
  result: ToSSGResult
) => void | Promise<void>
```

### BeforeRequestHook/AfterResponseHook

`toSSG` は app に登録されているすべてのルートを対象にしますが、除外したいルートが有る場合は、フックを指定することでフィルターをかけることができます。

例えば、 GET リクエストだけを出力したい場合は、 `beforeRequestHook` で `req.method` を使ってフィルターします。

```ts
toSSG(app, fs, {
  beforeRequestHook: (req) => {
    if (req.method === 'GET') {
      return req
    }
    return false
  },
})
```

また、ステータスコードが 200 か 500 の場合のみ出力したい場合は、 `afterResponseHook` で `res.status` を使ってフィルターします。

```ts
toSSG(app, fs, {
  afterResponseHook: (res) => {
    if (res.status === 200 || res.status === 500) {
      return res
    }
    return false
  },
})
```

### AfterGenerateHook

`afterGenerateHook` を使うことで、 `toSSG` の結果をフックできます。

```ts
toSSG(app, fs, {
  afterGenerateHook: (result) => {
    if (result.files) {
      result.files.forEach((file) => console.log(file))
    }
  })
})
```

## ファイルを作成する

### ルートとファイル名

このようなルールがルートと作成されるファイル名に適応されます。 デフォルトの出力ディレクトリの `./static` ではこのようになります:

- `/` -> `./static/index.html`
- `/path` -> `./static/path.html`
- `/path/` -> `./static/path/index.html`

### 拡張子

拡張子はそれぞれのルートが返す `Content-Type` に依存します。 例えば、 `c.html` で返されたレスポンスは `.html` として保存されます。

拡張子をカスタマイズしたい場合は、 `extensionMap` オプションを指定してください。

```ts
import { toSSG, defaultExtensionMap } from 'hono/ssg'

// Save `application/x-html` content with `.html`
toSSG(app, fs, {
  extensionMap: {
    'application/x-html': 'html',
    ...defaultExtensionMap,
  },
})
```

スラッシュで終わるパスはファイルタイプに関係なく index.拡張子 として保存されることに注意してください。

```ts
// save to ./static/html/index.html
app.get('/html/', (c) => c.html('html'))

// save to ./static/text/index.txt
app.get('/text/', (c) => c.text('text'))
```

## ミドルウェア

これから紹介するビルトインミドルウェアは SSG の処理を補助します。

### ssgParams

Next.js の `generateStaticParams` のようなことをしたい場合に使います。

例:

```ts
app.get(
  '/shops/:id',
  ssgParams(async () => {
    const shops = await getShops()
    return shops.map((shop) => ({ id: shop.id }))
  }),
  async (c) => {
    const shop = await getShop(c.req.param('id'))
    if (!shop) {
      return c.notFound()
    }
    return c.render(
      <div>
        <h1>{shop.name}</h1>
      </div>
    )
  }
)
```

### disableSSG

`disableSSG` ミドルウェアを指定されたルートは `toSSG` のファイル生成から除外されます。

```ts
app.get('/api', disableSSG(), (c) => c.text('an-api'))
```

### onlySSG

`onlySSG` ミドルウェアを指定されたルートは `toSSG` 後の `c.notFound()` でオーバーライドされます。

```ts
app.get('/static-page', onlySSG(), (c) => c.html(<h1>Welcome to my site</h1>))
```

## Plugins

Plugins allow you to extend the functionality of the static site generation process. It can perform custom actions at various hooks during generation.

### Plugin Interface

```ts
export interface SSGPlugin {
  beforeRequestHook?: BeforeRequestHook | BeforeRequestHook[]
  afterResponseHook?: AfterResponseHook | AfterResponseHook[]
  afterGenerateHook?: AfterGenerateHook | AfterGenerateHook[]
}
```

### Creating a plugin

Here's an example of creating a sitemap plugin that generates a `sitemap.xml` file:

```ts
// plugins.ts
import fs from 'node:fs/promises'
import path from 'node:path'
import type { SSGPlugin } from 'hono/ssg'
import { DEFAULT_OUTPUT_DIR } from 'hono/ssg'

export const sitemapPlugin = (baseURL: string): SSGPlugin => {
  return {
    afterGenerateHook: (result, fsModule, options) => {
      const outputDir = options?.dir ?? DEFAULT_OUTPUT_DIR
      const filePath = path.join(outputDir, 'sitemap.xml')
      const urls = result.files.map((file) =>
        new URL(file, baseURL).toString()
      )
      const siteMapText = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `<url><loc>${url}</loc></url>`).join('\n')}
</urlset>`
      fsModule.writeFile(filePath, siteMapText)
    },
  }
}
```

Applying the plugin:

```ts
import app from './index'
import { toSSG } from 'hono/ssg'
import { sitemapPlugin } from './plugins'

toSSG(app, fs, {
  plugins: [sitemapPlugin('https://example.com')],
})
```

The plugin will generate a `sitemap.xml` file containing all the generated static files.
