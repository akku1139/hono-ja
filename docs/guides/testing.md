# テスト

[Vitest]: https://vitest.dev/

テストは重要です。
実際に、Hono のアプリケーションをテストするのは簡単です。
テスト環境を構築する方法は、実行環境により異なりますが、基本の流れは同じです。
このセクションでは、Cloudflare Workers と [Vitest] を使ってテストしましょう。

::: tip
Cloudflare は、[@cloudflare/vitest-pool-workers](https://www.npmjs.com/package/@cloudflare/vitest-pool-workers) で [Vitest] を使用することを推奨しています。詳細については、Cloudflare Workers のドキュメント内の [Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/) を参照してください。
:::

## Request と Response

しなければならないことは、リクエストを生成して、レスポンスをバリデートするために Hono アプリケーションに渡すことだけです。`app.request` を使用することができます。

::: tip
テストクライントについては、[testing helper](/docs/helpers/testing) を参照してください。
:::

たとえば、次のような REST API を提供するアプリケーションを考えます。

```ts
app.get('/posts', (c) => {
  return c.text('Many posts')
})

app.post('/posts', (c) => {
  return c.json(
    {
      message: 'Created',
    },
    201,
    {
      'X-Custom': 'Thank you',
    }
  )
})
```

`GET /posts` にリクエストを送り、レスポンスをテストします。

```ts
describe('Example', () => {
  test('GET /posts', async () => {
    const res = await app.request('/posts')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Many posts')
  })
})
```

`POST /posts` にリクエストを送り、次のようにします。

```ts
test('POST /posts', async () => {
  const res = await app.request('/posts', {
    method: 'POST',
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

 `POST /posts` に `JSON` データのリクエストを送り、次のようにします。

```ts
test('POST /posts', async () => {
  const res = await app.request('/posts', {
    method: 'POST',
    body: JSON.stringify({ message: 'hello hono' }),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

 `POST /posts` に `multipart/form-data` データのリクエストを送り、次のようにします。

```ts
test('POST /posts', async () => {
  const formData = new FormData()
  formData.append('message', 'hello')
  const res = await app.request('/posts', {
    method: 'POST',
    body: formData,
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

リクエストクラスのインスタンスを渡すこともできます。

```ts
test('POST /posts', async () => {
  const req = new Request('http://localhost/posts', {
    method: 'POST',
  })
  const res = await app.request(req)
  expect(res.status).toBe(201)
  expect(res.headers.get('X-Custom')).toBe('Thank you')
  expect(await res.json()).toEqual({
    message: 'Created',
  })
})
```

このようにしてエンドツーエンドのようにテストすることができます。

## Env

テスト用に `c.env` をセットするために、`app.request` の第 3 パラメータとしてその値を渡すことができます。これは [Cloudflare Workers Bindings](https://hono.dev/getting-started/cloudflare-workers#bindings) のような値のモックを使用する際に有用です:

```ts
const MOCK_ENV = {
  API_HOST: 'example.com',
  DB: {
    prepare: () => {
      /* mocked D1 */
    },
  },
}

test('GET /posts', async () => {
  const res = await app.request('/posts', {}, MOCK_ENV)
})
```
