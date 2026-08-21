# Pretty JSON ミドルウェア

Pretty JSON ミドルウェアは、 JSON レスポンスボディに対して "_JSON pretty print_" を有効にします。
URL のクエリパラメータに `?pretty` を追加すると、 JSON 文字列が整形されます。

```js
// GET /
{"project":{"name":"Hono","repository":"https://github.com/honojs/hono"}}
```

これは次のようになります:

```js
// GET /?pretty
{
  "project": {
    "name": "Hono",
    "repository": "https://github.com/honojs/hono"
  }
}
```

## Import

```ts
import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
```

## 使い方

```ts
const app = new Hono()

app.use(prettyJSON()) // With options: prettyJSON({ space: 4 })
app.get('/', (c) => {
  return c.json({ message: 'Hono!' })
})
```

## オプション

### <Badge type="info" text="optional" /> space: `number`

インデントに使用するスペースの数です。 デフォルトは `2` です。

### <Badge type="info" text="optional" /> query: `string`

適用するためのクエリ文字列の名前です。 デフォルトは `pretty` です。

### <Badge type="info" text="optional" /> force: `boolean`

`true` に設定すると、クエリパラメータに関係なく JSON レスポンスが常に整形されます。 デフォルトは `false` です。
