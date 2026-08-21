# CSRF 保護

このミドルウェアは、 `Origin` ヘッダーと `Sec-Fetch-Site` ヘッダーの両方をチェックすることで、 CSRF 攻撃から保護します。 いずれかの検証に合格すれば、リクエストは許可されます。

ミドルウェアが検証するのは、次のようなリクエストのみです:

- 安全でない HTTP メソッドを使用している (GET 、 HEAD 、 OPTIONS 以外)
- HTML フォームで送信可能なコンテンツタイプを持っている (`application/x-www-form-urlencoded` 、 `multipart/form-data` 、 `text/plain`)

`Origin` ヘッダーを送信しない古いブラウザや、リバースプロキシでこれらのヘッダーを削除する環境では、うまく動作しない場合があります。 そのような環境では、他の CSRF トークン方式を使用してください。

## Import

```ts
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
```

## 使い方

```ts
const app = new Hono()

// Default: both origin and sec-fetch-site validation
app.use(csrf())

// Allow specific origins
app.use(csrf({ origin: 'https://myapp.example.com' }))

// Allow multiple origins
app.use(
  csrf({
    origin: [
      'https://myapp.example.com',
      'https://development.myapp.example.com',
    ],
  })
)

// Allow specific sec-fetch-site values
app.use(csrf({ secFetchSite: 'same-origin' }))
app.use(csrf({ secFetchSite: ['same-origin', 'none'] }))

// Dynamic origin validation
// It is strongly recommended that the protocol be verified to ensure a match to `$`.
// You should *never* do a forward match.
app.use(
  '*',
  csrf({
    origin: (origin) =>
      /https:\/\/(\w+\.)?myapp\.example\.com$/.test(origin),
  })
)

// Dynamic sec-fetch-site validation
app.use(
  csrf({
    secFetchSite: (secFetchSite, c) => {
      // Always allow same-origin
      if (secFetchSite === 'same-origin') return true
      // Allow cross-site for webhook endpoints
      if (
        secFetchSite === 'cross-site' &&
        c.req.path.startsWith('/webhook/')
      ) {
        return true
      }
      return false
    },
  })
)
```

## オプション

### <Badge type="info" text="optional" /> origin: `string` | `string[]` | `Function`

CSRF 保護で許可するオリジンを指定します。

- **`string`**: 単一の許可オリジン (例: `'https://example.com'`)
- **`string[]`**: 許可オリジンの配列
- **`Function`**: 柔軟なオリジン検証とバイパスロジックのためのカスタムハンドラ `(origin: string, context: Context) => boolean`

**Default**: リクエスト URL と同じオリジンのみ

関数ハンドラは、リクエストの `Origin` ヘッダーの値とリクエストコンテキストを受け取ります。 これにより、パス、ヘッダー、その他のコンテキストデータなどのリクエストプロパティに基づいた動的な検証が可能になります。

### <Badge type="info" text="optional" /> secFetchSite: `string` | `string[]` | `Function`

[Fetch Metadata](https://web.dev/articles/fetch-metadata) を使用した CSRF 保護で許可する Sec-Fetch-Site ヘッダーの値を指定します。

- **`string`**: 単一の許可値 (例: `'same-origin'`)
- **`string[]`**: 許可値の配列 (例: `['same-origin', 'none']`)
- **`Function`**: 柔軟な検証のためのカスタムハンドラ `(secFetchSite: string, context: Context) => boolean`

**Default**: `'same-origin'` のみ許可

標準の Sec-Fetch-Site の値:

- `same-origin`: 同一オリジンからのリクエスト
- `same-site`: 同一サイト (異なるサブドメイン) からのリクエスト
- `cross-site`: 異なるサイトからのリクエスト
- `none`: Web ページ以外からのリクエスト (例: ブラウザのアドレスバー、ブックマーク)

関数ハンドラは、リクエストの `Sec-Fetch-Site` ヘッダーの値とリクエストコンテキストを受け取り、リクエストのプロパティに基づいた動的な検証を可能にします。
