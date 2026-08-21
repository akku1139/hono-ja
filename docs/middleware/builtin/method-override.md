# Method Override ミドルウェア

このミドルウェアは、フォーム、ヘッダー、クエリの値に応じて、リクエストの実際のメソッドとは異なる指定されたメソッドのハンドラーを実行し、そのレスポンスを返します。

## Import

```ts
import { Hono } from 'hono'
import { methodOverride } from 'hono/method-override'
```

## 使い方

```ts
const app = new Hono()

// If no options are specified, the value of `_method` in the form,
// e.g. DELETE, is used as the method.
app.use('/posts', methodOverride({ app }))

app.delete('/posts', (c) => {
  // ....
})
```

## 例

HTML フォームは DELETE メソッドを送信できないため、 `_method` という名前のプロパティに `DELETE` の値を入れて送信できます。 すると、 `app.delete()` のハンドラーが実行されます。

HTML フォーム:

```html
<form action="/posts" method="POST">
  <input type="hidden" name="_method" value="DELETE" />
  <input type="text" name="id" />
</form>
```

アプリケーション:

```ts
import { methodOverride } from 'hono/method-override'

const app = new Hono()
app.use('/posts', methodOverride({ app }))

app.delete('/posts', () => {
  // ...
})
```

デフォルト値を変更したり、ヘッダー値やクエリ値を使用できます:

```ts
app.use('/posts', methodOverride({ app, form: '_custom_name' }))
app.use(
  '/posts',
  methodOverride({ app, header: 'X-METHOD-OVERRIDE' })
)
app.use('/posts', methodOverride({ app, query: '_method' }))
```

## オプション

### <Badge type="danger" text="required" /> app: `Hono`

アプリケーションで使用される `Hono` のインスタンスです。

### <Badge type="info" text="optional" /> form: `string`

メソッド名を含む値を持つフォームのキーです。
デフォルトは `_method` です。

### <Badge type="info" text="optional" /> header: `boolean`

メソッド名を含む値を持つヘッダー名です。

### <Badge type="info" text="optional" /> query: `boolean`

メソッド名を含む値を持つクエリパラメータのキーです。
