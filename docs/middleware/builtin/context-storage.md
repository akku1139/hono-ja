# Context Storage ミドルウェア

Context Storage Middleware は、 Hono の `Context` を `AsyncLocalStorage` に保存し、グローバルにアクセスできるようにします。

::: info
**Note** このミドルウェアは `AsyncLocalStorage` を使用します。 ランタイムがこれをサポートしている必要があります。

**Cloudflare Workers**: `AsyncLocalStorage` を有効にするには、 `wrangler.toml` ファイルに [`nodejs_compat` または `nodejs_als` フラグ](https://developers.cloudflare.com/workers/configuration/compatibility-dates/#nodejs-compatibility-flag) を追加してください。
:::

## Import

```ts
import { Hono } from 'hono'
import {
  contextStorage,
  getContext,
  tryGetContext,
} from 'hono/context-storage'
```

## 使い方

`contextStorage()` がミドルウェアとして適用されている場合、 `getContext()` は現在の Context オブジェクトを返します。

```ts
type Env = {
  Variables: {
    message: string
  }
}

const app = new Hono<Env>()

app.use(contextStorage())

app.use(async (c, next) => {
  c.set('message', 'Hello!')
  await next()
})

// You can access the variable outside the handler.
const getMessage = () => {
  return getContext<Env>().var.message
}

app.get('/', (c) => {
  return c.text(getMessage())
})
```

Cloudflare Workers では、ハンドラーの外部から Bindings にアクセスできます。

```ts
type Env = {
  Bindings: {
    KV: KVNamespace
  }
}

const app = new Hono<Env>()

app.use(contextStorage())

const setKV = (value: string) => {
  return getContext<Env>().env.KV.put('key', value)
}
```

## tryGetContext

`tryGetContext()` は `getContext()` と同様に動作しますが、コンテキストが利用できない場合にエラーをスローする代わりに `undefined` を返します:

```ts
const context = tryGetContext<Env>()
if (context) {
  // Context is available
  console.log(context.var.message)
}
```
