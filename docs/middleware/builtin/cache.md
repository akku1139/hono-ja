# Cache ミドルウェア

Cache ミドルウェアは、 Web 標準の [Cache API](https://developer.mozilla.org/ja/docs/Web/API/Cache) を使用します。

Cache ミドルウェアは現在、カスタムドメインを使用する Cloudflare Workers プロジェクトと、 [Deno 1.26+](https://github.com/denoland/deno/releases/tag/v1.26.0) を使用する Deno プロジェクトをサポートしています。 Deno Deploy でも利用できます。

Cloudflare Workers は `Cache-Control` ヘッダーを尊重し、キャッシュされたレスポンスを返します。 詳細については、 [Cloudflare Docs の Cache](https://developers.cloudflare.com/workers/runtime-apis/cache/) を参照してください。 Deno はヘッダーを尊重しないため、キャッシュを更新する必要がある場合は、独自のメカニズムを実装する必要があります。

各プラットフォームでの手順については、後述の [使い方](#usage) を参照してください。

## Import

```ts
import { Hono } from 'hono'
import { cache } from 'hono/cache'
```

## 使い方

::: code-group

```ts [Cloudflare Workers]
app.get(
  '*',
  cache({
    cacheName: 'my-app',
    cacheControl: 'max-age=3600',
  })
)
```

```ts [Deno]
// Must use `wait: true` for the Deno runtime
app.get(
  '*',
  cache({
    cacheName: 'my-app',
    cacheControl: 'max-age=3600',
    wait: true,
  })
)
```

:::

## QUERY リクエストのキャッシュ

Cache ミドルウェアは、 [QUERY](https://www.rfc-editor.org/rfc/rfc10008.html) リクエストへのレスポンスもキャッシュします。 RFC 10008 の要件に従い、 QUERY リクエストのキャッシュキーにはリクエストコンテンツとその表現メタデータのダイジェストが組み込まれるため、ボディが異なるリクエストは個別にキャッシュされます。

`maxQueryBodySize` (デフォルトは 64 KiB) より大きいボディを持つ QUERY リクエストは、キャッシュをバイパスします。

::: info
これをサポートするために、キャッシュされたエントリは、リクエスト URL 自体の代わりに `/.hono/cache?__hono_cache_key=...` という形式の内部キーで保存されます。 Cache API を通じて直接キャッシュエントリをパージする場合 (例えば、元のリクエスト URL で `caches.delete()` を呼び出す場合) 、そのロジックを更新する必要があります。 これは GET を含むすべてのメソッドに適用されます。
:::

## オプション

### <Badge type="danger" text="required" /> cacheName: `string` | `(c: Context) => string` | `Promise<string>`

キャッシュの名前です。 異なる識別子を持つ複数のキャッシュを保存するために使用できます。

### <Badge type="info" text="optional" /> wait: `boolean`

Hono がリクエストの処理を続行する前に、 `cache.put` 関数の Promise の解決を待つべきかどうかを示すブール値です。 _Deno 環境では true である必要があります_ 。 デフォルトは `false` です。

### <Badge type="info" text="optional" /> cacheControl: `string`

`Cache-Control` ヘッダーのためのディレクティブ文字列です。 詳しくは [MDN ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cache-Control) を参照してください。 このオプションが指定されていない場合、リクエストに `Cache-Control` ヘッダーは追加されません。

### <Badge type="info" text="optional" /> vary: `string` | `string[]`

レスポンスに `Vary` ヘッダーを設定します。 元のレスポンスヘッダーに既に `Vary` ヘッダーが含まれている場合、重複を削除した上で値がマージされます。 これを `*` に設定するとエラーになります。 Vary ヘッダーとキャッシング戦略への影響について詳しくは、 [MDN ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Vary) を参照してください。

### <Badge type="info" text="optional" /> keyGenerator: `(c: Context) => string | Promise<string>`

`cacheName` ストア内のすべてのリクエストに対してキーを生成します。 これを使用して、リクエストパラメータやコンテキストパラメータに基づいてデータをキャッシュできます。 デフォルトは `c.req.url` です。 QUERY リクエストの場合、キーにはさらにリクエストコンテンツとその表現メタデータのダイジェストが含まれます。

### <Badge type="info" text="optional" /> maxQueryBodySize: `number`

キャッシュ可能な QUERY リクエストのボディサイズの最大値 (バイト) です。 それより大きいボディを持つ QUERY リクエストはキャッシュをバイパスします。 デフォルトは `65536` (64 KiB) です。

### <Badge type="info" text="optional" /> cacheableStatusCodes: `number[]`

キャッシュすべきステータスコードの配列です。 デフォルトは `[200]` です。 このオプションを使用して、特定のステータスコードを持つレスポンスをキャッシュします。

```ts
app.get(
  '*',
  cache({
    cacheName: 'my-app',
    cacheControl: 'max-age=3600',
    cacheableStatusCodes: [200, 404, 412],
  })
)
```

### <Badge type="info" text="optional" /> onCacheNotAvailable: `((reason: string) => void | Promise<void>)` | `false`

Cache API がグローバルスコープで利用できない場合や、 QUERY キャッシングが Web Crypto を使用できない場合の挙動を制御するコールバック関数または `false` です。 コールバックは理由とともに呼び出されます。 デフォルトでは、理由は `console.log` でログに出力されます。 カスタム関数を提供して挙動をカスタマイズしたり、 `false` を設定してログを完全に抑制したりできます。

```ts
// Custom logging
app.use(
  cache({
    cacheName: 'my-app-v1',
    onCacheNotAvailable: () => {
      console.log('Custom log: Cache API is not available.')
    },
  })
)
```

```ts
// Suppress logging
app.use(
  cache({
    cacheName: 'my-app-v1',
    onCacheNotAvailable: false,
  })
)
```
