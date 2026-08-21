# Combine ミドルウェア

Combine Middleware は、複数のミドルウェア関数を1つのミドルウェアに結合します。 次の3つの関数を提供します:

- `some` - 与えられたミドルウェアのうち1つだけを実行します。
- `every` - 与えられたすべてのミドルウェアを実行します。
- `except` - 条件が満たされない場合にのみ、与えられたすべてのミドルウェアを実行します。

## Import

```ts
import { Hono } from 'hono'
import { some, every, except } from 'hono/combine'
```

## 使い方

Combine Middleware を使った複雑なアクセス制御ルールの例です。

```ts
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { getConnInfo } from 'hono/cloudflare-workers'
import { every, some } from 'hono/combine'
import { ipRestriction } from 'hono/ip-restriction'
import { rateLimit } from '@/my-rate-limit'

const app = new Hono()

app.use(
  '*',
  some(
    every(
      ipRestriction(getConnInfo, { allowList: ['192.168.0.2'] }),
      bearerAuth({ token })
    ),
    // If both conditions are met, rateLimit will not execute.
    rateLimit()
  )
)

app.get('/', (c) => c.text('Hello Hono!'))
```

### some

true を返した最初のミドルウェアを実行します。 ミドルウェアは順番に適用され、いずれかのミドルウェアが正常に終了すると、それ以降のミドルウェアは実行されません。

```ts
import { some } from 'hono/combine'
import { bearerAuth } from 'hono/bearer-auth'
import { myRateLimit } from '@/rate-limit'

// If client has a valid token, skip rate limiting.
// Otherwise, apply rate limiting.
app.use(
  '/api/*',
  some(bearerAuth({ token }), myRateLimit({ limit: 100 }))
)
```

### every

すべてのミドルウェアを実行し、いずれかが失敗した場合は停止します。 ミドルウェアは順番に適用され、いずれかのミドルウェアがエラーをスローすると、それ以降のミドルウェアは実行されません。

```ts
import { some, every } from 'hono/combine'
import { bearerAuth } from 'hono/bearer-auth'
import { myCheckLocalNetwork } from '@/check-local-network'
import { myRateLimit } from '@/rate-limit'

// If client is in local network, skip authentication and rate limiting.
// Otherwise, apply authentication and rate limiting.
app.use(
  '/api/*',
  some(
    myCheckLocalNetwork(),
    every(bearerAuth({ token }), myRateLimit({ limit: 100 }))
  )
)
```

### except

条件が満たされていない場合にすべてのミドルウェアを実行します。 条件として文字列または関数を渡せます。 複数のターゲットにマッチさせる必要がある場合は、配列として渡します。

```ts
import { except } from 'hono/combine'
import { bearerAuth } from 'hono/bearer-auth'

// If client is accessing public API, skip authentication.
// Otherwise, require a valid token.
app.use('/api/*', except('/api/public/*', bearerAuth({ token })))
```
