# Secure Headers ミドルウェア

Secure Headers Middleware は、セキュリティヘッダーの設定を簡単にします。 Helmet の機能に一部インスピレーションを受けており、特定のセキュリティヘッダーの有効化と無効化を制御できます。

## Import

```ts
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
```

## 使い方

デフォルトで、最適な設定を使用できます。

```ts
const app = new Hono()
app.use(secureHeaders())
```

不要なヘッダーは、 `false` を設定することで抑制できます。

```ts
const app = new Hono()
app.use(
  '*',
  secureHeaders({
    xFrameOptions: false,
    xXssProtection: false,
  })
)
```

デフォルトのヘッダー値は、文字列で上書きできます。

```ts
const app = new Hono()
app.use(
  '*',
  secureHeaders({
    strictTransportSecurity:
      'max-age=63072000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
    xXssProtection: '1',
  })
)
```

## サポートされているオプション

各オプションは、次のヘッダーのキーと値のペアに対応しています。

| Option                          | Header                                                                                                                                         | Value                                                                      | Default    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| -                               | X-Powered-By                                                                                                                                   | (Delete Header)                                                            | True       |
| contentSecurityPolicy           | [Content-Security-Policy](https://developer.mozilla.org/ja/docs/Web/HTTP/CSP)                                                                  | Usage: [Setting Content-Security-Policy](#setting-content-security-policy) | No Setting |
| contentSecurityPolicyReportOnly | [Content-Security-Policy-Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only)           | Usage: [Setting Content-Security-Policy](#setting-content-security-policy) | No Setting |
| trustedTypes                    | [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/trusted-types)                               | Usage: [Setting Content-Security-Policy](#setting-content-security-policy) | No Setting |
| requireTrustedTypesFor          | [Require Trusted Types For](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-trusted-types-for)       | Usage: [Setting Content-Security-Policy](#setting-content-security-policy) | No Setting |
| crossOriginEmbedderPolicy       | [Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)                         | require-corp                                                               | **False**  |
| crossOriginResourcePolicy       | [Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy)                         | same-origin                                                                | True       |
| crossOriginOpenerPolicy         | [Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)                             | same-origin                                                                | True       |
| originAgentCluster              | [Origin-Agent-Cluster](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin-Agent-Cluster)                                         | ?1                                                                         | True       |
| referrerPolicy                  | [Referrer-Policy](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Referrer-Policy)                                                      | no-referrer                                                                | True       |
| reportingEndpoints              | [Reporting-Endpoints](https://www.w3.org/TR/reporting-1/#header)                                                                               | Usage: [Setting Content-Security-Policy](#setting-content-security-policy) | No Setting |
| reportTo                        | [Report-To](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to)                                       | Usage: [Setting Content-Security-Policy](#setting-content-security-policy) | No Setting |
| strictTransportSecurity         | [Strict-Transport-Security](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Strict-Transport-Security)                                  | max-age=15552000; includeSubDomains                                        | True       |
| xContentTypeOptions             | [X-Content-Type-Options](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/X-Content-Type-Options)                                        | nosniff                                                                    | True       |
| xDnsPrefetchControl             | [X-DNS-Prefetch-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control)                                     | off                                                                        | True       |
| xDownloadOptions                | [X-Download-Options](https://learn.microsoft.com/en-us/archive/blogs/ie/ie8-security-part-v-comprehensive-protection#mime-handling-force-save) | noopen                                                                     | True       |
| xFrameOptions                   | [X-Frame-Options](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/X-Frame-Options)                                                      | SAMEORIGIN                                                                 | True       |
| xPermittedCrossDomainPolicies   | [X-Permitted-Cross-Domain-Policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Permitted-Cross-Domain-Policies)               | none                                                                       | True       |
| xXssProtection                  | [X-XSS-Protection](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/X-XSS-Protection)                                                    | 0                                                                          | True       |
| permissionPolicy                | [Permissions-Policy](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Permissions-Policy)                                                | Usage: [Setting Permission-Policy](#setting-permission-policy)             | No Setting |

## Middleware Conflict

同じヘッダーを操作するミドルウェアを扱う場合は、指定の順序に注意してください。

この場合、 Secure-headers が動作し、 `x-powered-by` は削除されます:

```ts
const app = new Hono()
app.use(secureHeaders())
app.use(poweredBy())
```

この場合、 Powered-By が動作し、 `x-powered-by` は追加されます:

```ts
const app = new Hono()
app.use(poweredBy())
app.use(secureHeaders())
```

## Content-Security-Policy の設定

```ts
const app = new Hono()
app.use(
  '/test',
  secureHeaders({
    reportingEndpoints: [
      {
        name: 'endpoint-1',
        url: 'https://example.com/reports',
      },
    ],
    // -- or alternatively
    // reportTo: [
    //   {
    //     group: 'endpoint-1',
    //     max_age: 10886400,
    //     endpoints: [{ url: 'https://example.com/reports' }],
    //   },
    // ],
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      childSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      manifestSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      reportTo: 'endpoint-1',
      reportUri: '/csp-report',
      sandbox: ['allow-same-origin', 'allow-scripts'],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      scriptSrcElem: ["'self'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      styleSrcAttr: ['none'],
      styleSrcElem: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'"],
    },
  })
)
```

### `nonce` 属性

`hono/secure-headers` からインポートした `NONCE` を `scriptSrc` または `styleSrc` に追加することで、 `script` または `style` 要素に [`nonce` 属性](https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/nonce) を追加できます:

```tsx
import { secureHeaders, NONCE } from 'hono/secure-headers'
import type { SecureHeadersVariables } from 'hono/secure-headers'

// Specify the variable types to infer the `c.get('secureHeadersNonce')`:
type Variables = SecureHeadersVariables

const app = new Hono<{ Variables: Variables }>()

// Set the pre-defined nonce value to `scriptSrc`:
app.get(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      scriptSrc: [NONCE, 'https://allowed1.example.com'],
    },
  })
)

// Get the value from `c.get('secureHeadersNonce')`:
app.get('/', (c) => {
  return c.html(
    <html>
      <body>
        {/** contents */}
        <script
          src='/js/client.js'
          nonce={c.get('secureHeadersNonce')}
        />
      </body>
    </html>
  )
})
```

nonce 値を自分で生成したい場合は、次のように関数を指定することもできます:

```tsx
const app = new Hono<{
  Variables: { myNonce: string }
}>()

const myNonceGenerator: ContentSecurityPolicyOptionHandler = (c) => {
  // This function is called on every request.
  const nonce = Math.random().toString(36).slice(2)
  c.set('myNonce', nonce)
  return `'nonce-${nonce}'`
}

app.get(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      scriptSrc: [myNonceGenerator, 'https://allowed1.example.com'],
    },
  })
)

app.get('/', (c) => {
  return c.html(
    <html>
      <body>
        {/** contents */}
        <script src='/js/client.js' nonce={c.get('myNonce')} />
      </body>
    </html>
  )
})
```

## Permission-Policy の設定

Permission-Policy ヘッダーにより、ブラウザでどの機能や API が使用できるかを制御できます。 設定方法の例は次の通りです:

```ts
const app = new Hono()
app.use(
  '*',
  secureHeaders({
    permissionsPolicy: {
      fullscreen: ['self'], // fullscreen=(self)
      bluetooth: ['none'], // bluetooth=(none)
      payment: ['self', 'https://example.com'], // payment=(self "https://example.com")
      syncXhr: [], // sync-xhr=()
      camera: false, // camera=none
      microphone: true, // microphone=*
      geolocation: ['*'], // geolocation=*
      usb: ['self', 'https://a.example.com', 'https://b.example.com'], // usb=(self "https://a.example.com" "https://b.example.com")
      accelerometer: ['https://*.example.com'], // accelerometer=("https://*.example.com")
      gyroscope: ['src'], // gyroscope=(src)
      magnetometer: [
        'https://a.example.com',
        'https://b.example.com',
      ], // magnetometer=("https://a.example.com" "https://b.example.com")
    },
  })
)
```
