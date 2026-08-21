# Logger ミドルウェア

シンプルなロガーです。

## Import

```ts
import { Hono } from 'hono'
import { logger } from 'hono/logger'
```

## 使い方

```ts
const app = new Hono()

app.use(logger())
app.get('/', (c) => c.text('Hello Hono!'))
```

## ログの詳細

Logger Middleware は、各リクエストについて以下の詳細をログに出力します:

- **Incoming Request**: HTTP メソッド、リクエストパス、受信したリクエストをログに出力します。
- **Outgoing Response**: HTTP メソッド、リクエストパス、レスポンスのステータスコード、リクエスト/レスポンスの時間をログに出力します。
- **Status Code Coloring**: レスポンスのステータスコードは、視認性を高め、ステータスカテゴリを素早く識別できるように色分けされます。 異なるステータスコードのカテゴリは、異なる色で表現されます。
- **Elapsed Time**: リクエスト/レスポンスのサイクルにかかった時間は、人間が読める形式で、ミリ秒 (ms) または秒 (s) のいずれかでログに出力されます。

Logger Middleware を使用することで、 Hono アプリケーションにおけるリクエストとレスポンスの流れを簡単に監視し、問題やパフォーマンスのボトルネックを素早く特定できます。

独自の `PrintFunc` 関数を提供することで、ログの挙動をカスタマイズし、ミドルウェアをさらに拡張することもできます。

::: tip

_status code coloring_ を無効にするには、 `NO_COLOR` 環境変数を設定します。 これは、ロギングライブラリで ANSI カラーエスケープコードを無効にする一般的な方法で、 <https://no-color.org/> で説明されています。 なお、 Cloudflare Workers には `process.env` オブジェクトがないため、デフォルトではプレーンテキストのログ出力になります。
:::

## PrintFunc

Logger Middleware は、オプションの `PrintFunc` 関数をパラメータとして受け取ります。 この関数により、ロガーをカスタマイズしたり、追加のログを出力したりできます。

## オプション

### <Badge type="info" text="optional" /> fn: `PrintFunc(str: string, ...rest: string[])`

- `str`: ロガーから渡されます。
- `...rest`: コンソールに出力される追加の文字列 props です。

### 例

Logger Middleware にカスタム `PrintFunc` 関数を設定します:

```ts
export const customLogger = (message: string, ...rest: string[]) => {
  console.log(message, ...rest)
}

app.use(logger(customLogger))
```

ルート内でカスタムロガーを使用します:

```ts
app.post('/blog', (c) => {
  // Routing logic

  customLogger('Blog saved:', `Path: ${blog.url},`, `ID: ${blog.id}`)
  // Output
  // <-- POST /blog
  // Blog saved: Path: /blog/example, ID: 1
  // --> POST /blog 201 93ms

  // Return Context
})
```
