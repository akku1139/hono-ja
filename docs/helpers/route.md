# ルートヘルパー

Route Helper は、デバッグやミドルウェア開発のための拡張されたルーティング情報を提供します。 マッチしたルートや現在処理中のルートに関する詳細な情報にアクセスできます。

## インポート

```ts
import { Hono } from 'hono'
import {
  matchedRoutes,
  routePath,
  baseRoutePath,
  basePath,
} from 'hono/route'
```

## 使い方

### 基本的なルート情報

```ts
const app = new Hono()

app.get('/posts/:id', (c) => {
  const currentPath = routePath(c) // '/posts/:id'
  const routes = matchedRoutes(c) // Array of matched routes

  return c.json({
    path: currentPath,
    totalRoutes: routes.length,
  })
})
```

### サブアプリケーションでの使用

```ts
const app = new Hono()
const apiApp = new Hono()

apiApp.get('/posts/:id', (c) => {
  return c.json({
    routePath: routePath(c), // '/posts/:id'
    baseRoutePath: baseRoutePath(c), // '/api'
    basePath: basePath(c), // '/api' (with actual params)
  })
})

app.route('/api', apiApp)
```

## `matchedRoutes()`

ミドルウェアを含む、現在のリクエストにマッチしたすべてのルートの配列を返します。

```ts
app.all('/api/*', (c, next) => {
  console.log('API middleware')
  return next()
})

app.get('/api/users/:id', (c) => {
  const routes = matchedRoutes(c)
  // Returns: [
  //   { method: 'ALL', path: '/api/*', handler: [Function] },
  //   { method: 'GET', path: '/api/users/:id', handler: [Function] }
  // ]
  return c.json({ routes: routes.length })
})
```

## `routePath()`

現在のハンドラーに登録されたルートのパスパターンを返します。

```ts
app.get('/posts/:id', (c) => {
  console.log(routePath(c)) // '/posts/:id'
  return c.text('Post details')
})
```

### インデックスパラメータの使用

`Array.prototype.at()` と同様に、インデックスパラメータを渡すことで特定の位置のルートパスを取得できます。

```ts
app.all('/api/*', (c, next) => {
  return next()
})

app.get('/api/users/:id', (c) => {
  console.log(routePath(c, 0)) // '/api/*' (first matched route)
  console.log(routePath(c, -1)) // '/api/users/:id' (last matched route)
  return c.text('User details')
})
```

## `baseRoutePath()`

ルーティングで指定された現在のルートのベースパスパターンを返します。

```ts
const subApp = new Hono()
subApp.get('/posts/:id', (c) => {
  return c.text(baseRoutePath(c)) // '/:sub'
})

app.route('/:sub', subApp)
```

### インデックスパラメータの使用

`Array.prototype.at()` と同様に、インデックスパラメータを渡すことで特定の位置の
ベースルートパスを取得できます。

```ts
app.all('/api/*', (c, next) => {
  return next()
})

const subApp = new Hono()
subApp.get('/users/:id', (c) => {
  console.log(baseRoutePath(c, 0)) // '/' (first matched route)
  console.log(baseRoutePath(c, -1)) // '/api' (last matched route)
  return c.text('User details')
})

app.route('/api', subApp)
```

## `basePath()`

実際のリクエストから埋め込まれたパラメータを含むベースパスを返します。

```ts
const subApp = new Hono()
subApp.get('/posts/:id', (c) => {
  return c.text(basePath(c)) // '/api' (for request to '/api/posts/123')
})

app.route('/:sub', subApp)
```
