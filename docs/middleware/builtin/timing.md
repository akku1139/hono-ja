# Server-Timing ミドルウェア

[Server-Timing](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Server-Timing) Middleware は、
レスポンスヘッダーにパフォーマンスメトリクスを提供します。

::: info
Note: Cloudflare Workers では、 [タイマーは最後の I/O の時間のみを示す](https://developers.cloudflare.com/workers/learning/security-model/#step-1-disallow-timers-and-multi-threading) ため、
タイマーのメトリクスは正確でない場合があります。
:::

## Import

```ts [npm]
import { Hono } from 'hono'
import {
  timing,
  setMetric,
  startTime,
  endTime,
  wrapTime,
} from 'hono/timing'
import type { TimingVariables } from 'hono/timing'
```

## 使い方

```js
// Specify the variable types to infer the `c.get('metric')`:
type Variables = TimingVariables

const app = new Hono<{ Variables: Variables }>()

// add the middleware to your router
app.use(timing());

app.get('/', async (c) => {

  // add custom metrics
  setMetric(c, 'region', 'europe-west3')

  // add custom metrics with timing, must be in milliseconds
  setMetric(c, 'custom', 23.8, 'My custom Metric')

  // start a new timer
  startTime(c, 'db');
  const data = await db.findMany(...);

  // end the timer
  endTime(c, 'db');

  // ...or you can also just wrap a Promise using this function:
  const data = await wrapTime(c, 'db', db.findMany(...));

  return c.json({ response: data });
});
```

### 条件付きで有効化

```ts
const app = new Hono()

app.use(
  '*',
  timing({
    // c: Context of the request
    enabled: (c) => c.req.method === 'POST',
  })
)
```

## 結果

![](/images/timing-example.png)

## オプション

### <Badge type="info" text="optional" /> total: `boolean`

レスポンスの合計時間を表示します。 デフォルトは `true` です。

### <Badge type="info" text="optional" /> enabled: `boolean` | `(c: Context) => boolean`

ヘッダーにタイミングを追加するかどうかです。 デフォルトは `true` です。

### <Badge type="info" text="optional" /> totalDescription: `boolean`

レスポンスの合計時間の説明です。 デフォルトは `Total Response Time` です。

### <Badge type="info" text="optional" /> autoEnd: `boolean`

`startTime()` をリクエストの終了時に自動的に終了させるかどうかです。
無効にした場合、手動で終了されていないタイマーは表示されません。

### <Badge type="info" text="optional" /> crossOrigin: `boolean` | `string` | `(c: Context) => boolean | string`

このタイミングヘッダーが読み取り可能なオリジンです。

- false の場合、現在のオリジンからのみ。
- true の場合、すべてのオリジンから。
- 文字列の場合、そのドメイン (複数可) から。 複数のドメインはカンマで区切る必要があります。

デフォルトは `false` です。 詳しくは [ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Timing-Allow-Origin) をご覧ください。
