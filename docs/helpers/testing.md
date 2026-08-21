# テストヘルパー

Testing Helper は、 Hono アプリケーションのテストを容易にするための関数を提供します。

## Import

```ts
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
```

## `testClient()`

`testClient()` 関数は、 Hono のインスタンスを第1引数に取り、 [Hono Client](/docs/guides/rpc#client) と同様に、 Hono アプリケーションのルートに応じた型が付けられたオブジェクトを返します。 これにより、テスト内でエディタの自動補完を使いながら、型安全に定義したルートを呼び出せます。

**型推論に関する重要な注意:**

`testClient` がルートの型を正しく推論し、自動補完を提供するためには、 **`Hono` インスタンスに対して直接メソッドチェーンでルートを定義する必要があります**。

型推論は、チェーンされた `.get()` 、 `.post()` などの呼び出しを通じて型が流れることに依存しています。 Hono インスタンスを作成した後にルートを個別に定義した場合 ("Hello World" の例でよく見られる `const app = new Hono(); app.get(...)` のようなパターン)、 `testClient` は特定のルートに必要な型情報を持たず、型安全なクライアントの機能を利用できません。

**例:**

この例では、 `.get()` メソッドが `new Hono()` の呼び出しに直接チェーンされているため動作します:

```ts
// index.ts
const app = new Hono().get('/search', (c) => {
  const query = c.req.query('q')
  return c.json({ query: query, results: ['result1', 'result2'] })
})

export default app
```

```ts
// index.test.ts
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { describe, it, expect } from 'vitest' // Or your preferred test runner
import app from './app'

describe('Search Endpoint', () => {
  // Create the test client from the app instance
  const client = testClient(app)

  it('should return search results', async () => {
    // Call the endpoint using the typed client
    // Notice the type safety for query parameters (if defined in the route)
    // and the direct access via .$get()
    const res = await client.search.$get({
      query: { q: 'hono' },
    })

    // Assertions
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      query: 'hono',
      results: ['result1', 'result2'],
    })
  })
})
```

テストにヘッダーを含めたい場合は、呼び出しの第2パラメータとして渡します。 第2パラメータは `RequestInit` オブジェクトとして `init` プロパティも受け取ることができ、ヘッダー、メソッド、ボディなどを設定できます。 `init` プロパティの詳細は [こちら](/docs/guides/rpc#init-option) をご覧ください。

```ts
// index.test.ts
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { describe, it, expect } from 'vitest' // Or your preferred test runner
import app from './app'

describe('Search Endpoint', () => {
  // Create the test client from the app instance
  const client = testClient(app)

  it('should return search results', async () => {
    // Include the token in the headers and set the content type
    const token = 'this-is-a-very-clean-token'
    const res = await client.search.$get(
      {
        query: { q: 'hono' },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `application/json`,
        },
      }
    )

    // Assertions
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      query: 'hono',
      results: ['result1', 'result2'],
    })
  })
})
```
