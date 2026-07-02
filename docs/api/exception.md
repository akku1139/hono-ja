# HTTPException

致命的なエラーが発生した際に、Hono (や多くのエコシステムミドルウェア) は、`HTTPException` をスローするかもしれません。 これは、[エラーレスポンスを返す](#handling-httpexceptions) を簡素化したカスタム Hono `Error` です。

## HTTPException をスローする

ステータスコードとエラーメッセージあるいはカスタムレスポンスのどちらかを指定することで、独自の HTTPException をスローすることができます。

### カスタムメッセージ

基本的な `text` レスポンスを返すために、エラー `message` をセットするだけです。

```ts twoslash
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(401, { message: 'Unauthorized' })
```

### カスタムレスポンス

他のレスポンス型のために、あるいはレスポンスヘッダをセットするために、 `res` オプションを使用します。_コンストラクタに渡されたステータスは、レスポンスを生成するために使用されたものであることに注意してください_

```ts twoslash
import { HTTPException } from 'hono/http-exception'

const errorResponse = new Response('Unauthorized', {
  status: 401, // これは無視されます
  headers: {
    Authenticate: 'error="invalid_token"',
  },
})

throw new HTTPException(401, { res: errorResponse })
```

### Cause

いずれの場合も、 HTTPException に任意のデータを追加するために [`cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause) オプションを使用することができます。

```ts twoslash
import { Hono, Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
const app = new Hono()
declare const message: string
declare const authorize: (c: Context) => Promise<void>
// ---cut---
app.post('/login', async (c) => {
  try {
    await authorize(c)
  } catch (cause) {
    throw new HTTPException(401, { message, cause })
  }
  return c.redirect('/')
})
```

## HTTPException を処理する

[`app.onError`](/docs/api/hono#error-handling) を使用して、捕捉されなかった HTTPException を処理することができます。 HTTPException は `getResponse` メソッドを持っており、エラー `status` をもとに生成された新しい `Response` を返します。 エラーがスローされた際に、エラー `message` あるいは[カスタムレスポンス](#custom-response)のどちらかがセットされます。

```ts twoslash
import { Hono } from 'hono'
const app = new Hono()
// ---cut---
import { HTTPException } from 'hono/http-exception'

// ...

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // HTTPException で生成されたエラーレスポンスを返す
    return err.getResponse()
  }
  // 他の予期しないエラーが起きたら、ログを出力してから一般的な 500 レスポンスを返します
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

::: warning
**`HTTPException.getResponse` は、 `Context` を認識しません** `Context` で既にセットされたヘッダを含めるには、新しい `Response` にヘッダを適用しなければなりません。
:::
