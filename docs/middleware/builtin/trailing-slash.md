# Trailing Slash ミドルウェア

このミドルウェアは、 GET リクエストの URL 内の Trailing Slash を処理します。

`appendTrailingSlash` は、コンテンツが見つからなかった場合に、 Trailing Slash を追加した URL へリダイレクトします。 また、 `trimTrailingSlash` は Trailing Slash を削除します。

## Import

```ts
import { Hono } from 'hono'
import {
  appendTrailingSlash,
  trimTrailingSlash,
} from 'hono/trailing-slash'
```

## 使い方

`/about/me` への GET リクエストを `/about/me/` へリダイレクトする例です。

```ts
import { Hono } from 'hono'
import { appendTrailingSlash } from 'hono/trailing-slash'

const app = new Hono({ strict: true })

app.use(appendTrailingSlash())
app.get('/about/me/', (c) => c.text('With Trailing Slash'))
```

`/about/me/` への GET リクエストを `/about/me` へリダイレクトする例です。

```ts
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'

const app = new Hono({ strict: true })

app.use(trimTrailingSlash())
app.get('/about/me', (c) => c.text('Without Trailing Slash'))
```

## オプション

### <Badge type="info" text="optional" /> alwaysRedirect: `boolean`

デフォルトでは、 Trailing Slash ミドルウェアはレスポンスステータスが `404` の場合にのみリダイレクトします。 `alwaysRedirect` を `true` に設定すると、ミドルウェアはハンドラーを実行する前にリダイレクトします。 これは、デフォルトの挙動が機能しないワイルドカードルート (`*`) に便利です。

```ts
const app = new Hono()

app.use(trimTrailingSlash({ alwaysRedirect: true }))
app.get('/my-path/*', (c) => c.text('Wildcard route'))
```

このオプションは、 `trimTrailingSlash` と `appendTrailingSlash` の両方で利用できます。

### <Badge type="info" text="optional" /> skip: `(path: string) => boolean`

リクエストパスに基づいて、リダイレクトをスキップするかどうかを判定する関数です。 関数が `true` を返した場合、リダイレクトはスキップされます。 これは、ファイル拡張子を持つパスなど、特定のパスをリダイレクト対象から除外したい場合に便利です。

```ts
app.use(
  appendTrailingSlash({
    skip: (path) => /\.\w+$/.test(path),
  })
)
```

このオプションは、 `trimTrailingSlash` と `appendTrailingSlash` の両方で利用できます。

## Note

リクエストメソッドが `GET` で、レスポンスステータスが `404` の場合に有効になります。
