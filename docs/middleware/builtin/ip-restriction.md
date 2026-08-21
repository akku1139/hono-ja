# IP Restriction ミドルウェア

IP Restriction Middleware は、ユーザーの IP アドレスに基づいてリソースへのアクセスを制限するミドルウェアです。

## Import

```ts
import { Hono } from 'hono'
import { ipRestriction } from 'hono/ip-restriction'
```

## 使い方

Bun 上で動作するアプリケーションで、ローカルからのアクセスのみを許可したい場合は、次のように書けます。 拒否したいルールを `denyList` に、許可したいルールを `allowList` に指定します。

```ts
import { Hono } from 'hono'
import { getConnInfo } from 'hono/bun'
import { ipRestriction } from 'hono/ip-restriction'

const app = new Hono()

app.use(
  '*',
  ipRestriction(getConnInfo, {
    denyList: [],
    allowList: ['127.0.0.1', '::1'],
  })
)

app.get('/', (c) => c.text('Hello Hono!'))
```

環境に適した [ConnInfo Helper](/docs/helpers/conninfo) の `getConninfo` を `ipRestriction` の第1引数として渡します。 例えば、 Deno の場合は次のようになります:

```ts
import { getConnInfo } from 'hono/deno'
import { ipRestriction } from 'hono/ip-restriction'

//...

app.use(
  '*',
  ipRestriction(getConnInfo, {
    // ...
  })
)
```

## ルール

ルールの書き方は以下の手順に従ってください。

### IPv4

- `192.168.2.0` - Static IP Address
- `192.168.2.0/24` - CIDR Notation
- `*` - ALL Addresses

### IPv6

- `::1` - Static IP Address
- `::1/10` - CIDR Notation
- `*` - ALL Addresses

## エラー処理

エラーをカスタマイズするには、第3引数で `Response` を返します。

```ts
app.use(
  '*',
  ipRestriction(
    getConnInfo,
    {
      denyList: ['192.168.2.0/24'],
    },
    async (remote, c) => {
      return c.text(`Blocking access from ${remote.addr}`, 403)
    }
  )
)
```
