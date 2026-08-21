# Language ミドルウェア

Language Detector ミドルウェアは、様々なソースからユーザーの優先言語 (ロケール) を自動的に判定し、 `c.get('language')` 経由で利用できるようにします。 検出戦略には、クエリパラメータ、クッキー、ヘッダー、 URL パスセグメントが含まれます。 国際化 (i18n) やロケール固有のコンテンツに最適です。

## Import

```ts
import { Hono } from 'hono'
import { languageDetector } from 'hono/language'
```

## 基本的な使い方

クエリ文字列、クッキー、ヘッダー (デフォルトの順序) から言語を検出し、フォールバックとして英語を使用します:

```ts
const app = new Hono()

app.use(
  languageDetector({
    supportedLanguages: ['en', 'ar', 'ja'], // Must include fallback
    fallbackLanguage: 'en', // Required
  })
)

app.get('/', (c) => {
  const lang = c.get('language')
  return c.text(`Hello! Your language is ${lang}`)
})
```

### クライアントの例

```sh
# Via path
curl http://localhost:8787/ar/home

# Via query parameter
curl http://localhost:8787/?lang=ar

# Via cookie
curl -H 'Cookie: language=ja' http://localhost:8787/

# Via header
curl -H 'Accept-Language: ar,en;q=0.9' http://localhost:8787/
```

## デフォルト設定

```ts
export const DEFAULT_OPTIONS: DetectorOptions = {
  order: ['querystring', 'cookie', 'header'],
  lookupQueryString: 'lang',
  lookupCookie: 'language',
  lookupFromHeaderKey: 'accept-language',
  lookupFromPathIndex: 0,
  caches: ['cookie'],
  ignoreCase: true,
  fallbackLanguage: 'en',
  supportedLanguages: ['en'],
  cookieOptions: {
    sameSite: 'Strict',
    secure: true,
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true,
  },
  debug: false,
}
```

## 主な挙動

### 検出のワークフロー

1. **Order**: デフォルトではこの順序でソースをチェックします:
   - クエリパラメータ (?lang=ar)
   - クッキー (language=ar)
   - Accept-Language ヘッダー

2. **Caching**: 検出された言語をクッキーに保存します (デフォルトで1年)

3. **Fallback**: 有効な検出がなかった場合に `fallbackLanguage` を使用します (`supportedLanguages` に含まれている必要があります)

## 高度な設定

### カスタム検出順序

URL パスからの検出を優先します (例: /en/about):

```ts
app.use(
  languageDetector({
    order: ['path', 'cookie', 'querystring', 'header'],
    lookupFromPathIndex: 0, // /en/profile → index 0 = 'en'
    supportedLanguages: ['en', 'ar'],
    fallbackLanguage: 'en',
  })
)
```

### 段階的なロケールマッチング

`ja-JP` のような検出されたロケールコードが `supportedLanguages` に存在しない場合、ミドルウェアはサブタグを段階的に切り詰めてマッチを探します。 例えば、 `zh-Hant-CN` は `zh-Hant` 、次に `zh` を試します。 完全一致が常に優先されます。

```ts
app.use(
  languageDetector({
    supportedLanguages: ['en', 'ja', 'zh-Hant'],
    fallbackLanguage: 'en',
  })
)

// Accept-Language: ja-JP → matches 'ja'
// Accept-Language: zh-Hant-CN → matches 'zh-Hant'
```

### 言語コードの変換

複雑なコードを正規化します (例: en-US → en):

```ts
app.use(
  languageDetector({
    convertDetectedLanguage: (lang) => lang.split('-')[0],
    supportedLanguages: ['en', 'ja'],
    fallbackLanguage: 'en',
  })
)
```

### クッキーの設定

```ts
app.use(
  languageDetector({
    lookupCookie: 'app_lang',
    caches: ['cookie'],
    cookieOptions: {
      path: '/', // Cookie path
      sameSite: 'Lax', // Cookie same-site policy
      secure: true, // Only send over HTTPS
      maxAge: 86400 * 365, // 1 year expiration
      httpOnly: true, // Not accessible via JavaScript
      domain: '.example.com', // Optional: specific domain
    },
  })
)
```

クッキーキャッシュを無効にする場合:

```ts
languageDetector({
  caches: false,
})
```

### デバッグ

検出の過程をログに出力します:

```ts
languageDetector({
  debug: true, // Shows: "Detected from querystring: ar"
})
```

## オプションリファレンス

### 基本オプション

| Option               | Type             | Default                               | Required | Description            |
| :------------------- | :--------------- | :------------------------------------ | :------- | :--------------------- |
| `supportedLanguages` | `string[]`       | `['en']`                              | Yes      | Allowed language codes |
| `fallbackLanguage`   | `string`         | `'en'`                                | Yes      | Default language       |
| `order`              | `DetectorType[]` | `['querystring', 'cookie', 'header']` | No       | Detection sequence     |
| `debug`              | `boolean`        | `false`                               | No       | Enable logging         |

### 検出オプション

| Option                | Type     | Default             | Description          |
| :-------------------- | :------- | :------------------ | :------------------- |
| `lookupQueryString`   | `string` | `'lang'`            | Query parameter name |
| `lookupCookie`        | `string` | `'language'`        | Cookie name          |
| `lookupFromHeaderKey` | `string` | `'accept-language'` | Header name          |
| `lookupFromPathIndex` | `number` | `0`                 | Path segment index   |

### クッキーオプション

| Option                   | Type                          | Default      | Description          |
| :----------------------- | :---------------------------- | :----------- | :------------------- |
| `caches`                 | `CacheType[] \| false`        | `['cookie']` | Cache settings       |
| `cookieOptions.path`     | `string`                      | `'/'`        | Cookie path          |
| `cookieOptions.sameSite` | `'Strict' \| 'Lax' \| 'None'` | `'Strict'`   | SameSite policy      |
| `cookieOptions.secure`   | `boolean`                     | `true`       | HTTPS only           |
| `cookieOptions.maxAge`   | `number`                      | `31536000`   | Expiration (seconds) |
| `cookieOptions.httpOnly` | `boolean`                     | `true`       | JS accessibility     |
| `cookieOptions.domain`   | `string`                      | `undefined`  | Cookie domain        |

### 高度なオプション

| Option                    | Type                       | Default     | Description               |
| :------------------------ | :------------------------- | :---------- | :------------------------ |
| `ignoreCase`              | `boolean`                  | `true`      | Case-insensitive matching |
| `convertDetectedLanguage` | `(lang: string) => string` | `undefined` | Language code transformer |

## バリデーションとエラー処理

- `fallbackLanguage` は `supportedLanguages` に含まれている必要があります (セットアップ時にエラーをスローします)
- `lookupFromPathIndex` は 0 以上である必要があります
- 無効な設定はミドルウェアの初期化時にエラーをスローします
- 検出に失敗した場合は、黙って `fallbackLanguage` が使用されます

## よくあるレシピ

### パスベースのルーティング

```ts
app.get('/:lang/home', (c) => {
  const lang = c.get('language') // 'en', 'ar', etc.
  return c.json({ message: getLocalizedContent(lang) })
})
```

### 複数のサポート言語

```ts
languageDetector({
  supportedLanguages: ['en', 'en-GB', 'ar', 'ar-EG'],
  convertDetectedLanguage: (lang) => lang.replace('_', '-'), // Normalize
})
```
