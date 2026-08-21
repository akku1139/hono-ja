# Timeout ミドルウェア

Timeout Middleware を使うと、アプリケーション内のリクエストタイムアウトを簡単に管理できます。 リクエストの最大継続時間を設定し、指定されたタイムアウトを超えた場合にカスタムエラーレスポンスを定義することもできます。

## Import

```ts
import { Hono } from 'hono'
import { timeout } from 'hono/timeout'
```

## 使い方

デフォルト設定とカスタム設定の両方を使った Timeout Middleware の使用方法は次の通りです:

デフォルト設定:

```ts
const app = new Hono()

// Applying a 5-second timeout
app.use('/api', timeout(5000))

// Handling a route
app.get('/api/data', async (c) => {
  // Your route handler logic
  return c.json({ data: 'Your data here' })
})
```

カスタム設定:

```ts
import { HTTPException } from 'hono/http-exception'

// Custom exception factory function
const customTimeoutException = (context) =>
  new HTTPException(408, {
    message: `Request timeout after waiting ${context.req.headers.get(
      'Duration'
    )} seconds. Please try again later.`,
  })

// for Static Exception Message
// const customTimeoutException = new HTTPException(408, {
//   message: 'Operation timed out. Please try again later.'
// });

// Applying a 1-minute timeout with a custom exception
app.use('/api/long-process', timeout(60000, customTimeoutException))

app.get('/api/long-process', async (c) => {
  // Simulate a long process
  await new Promise((resolve) => setTimeout(resolve, 61000))
  return c.json({ data: 'This usually takes longer' })
})
```

## Notes

- タイムアウトの時間はミリ秒で指定できます。 指定された時間を超えると、ミドルウェアは自動的に promise を reject し、場合によってはエラーをスローします。

- Timeout Middleware はストリームと併用できません。 そのため、 `stream.close` と `setTimeout` を組み合わせて使用してください。

```ts
app.get('/sse', async (c) => {
  let id = 0
  let running = true
  let timer: number | undefined

  return streamSSE(c, async (stream) => {
    timer = setTimeout(() => {
      console.log('Stream timeout reached, closing stream')
      stream.close()
    }, 3000) as unknown as number

    stream.onAbort(async () => {
      console.log('Client closed connection')
      running = false
      clearTimeout(timer)
    })

    while (running) {
      const message = `It is ${new Date().toISOString()}`
      await stream.writeSSE({
        data: message,
        event: 'time-update',
        id: String(id++),
      })
      await stream.sleep(1000)
    }
  })
})
```

## Middleware Conflicts

エラー処理やその他のタイミング関連のミドルウェアを使用する場合は、この Timeout Middleware の挙動に影響を与える可能性があるため、ミドルウェアの順序に注意してください。
