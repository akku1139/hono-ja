# Client Components

`hono/jsx` はサーバサイドだけでなくクライアントサイドもサポートします。 このため、ブラウザで実行するインタラクティブな UI を生成することができます。 クライアントコンポーネントまたは `hono/jsx/dom` と呼んでいます。

とても高速で、サイズが小さいです。 `hono/jsx/dom` で作ったカウンタープログラムは、 Brotli 圧縮でわずか 2.8KB です。 React 用は 47.8KB になります。

このセクションではクライアントコンポーネント特有の機能を紹介します。

## カウンターサンプル

シンプルなカウンターサンプルです。 同じコードは、 React でも動作します。

```tsx
import { useState } from 'hono/jsx'
import { render } from 'hono/jsx/dom'

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

function App() {
  return (
    <html>
      <body>
        <Counter />
      </body>
    </html>
  )
}

const root = document.getElementById('root')
render(<App />, root)
```

## `render()`

指定された HTML 要素の中に JSX コンポーネントを挿入するために、 `render()` を使用することができます。

```tsx
render(<Component />, container)
```

[Counter サンプル](https://github.com/honojs/examples/tree/main/hono-vite-jsx) ですべてのサンプルコードを参照することができます。

## React と互換性のあるフック

hono/jsx/dom にはフックがあります。 これらは、 React と完全に互換性があるか、または部分的に互換性があります。 [React のドキュメント](https://react.dev/reference/react/hooks) を参照してこれらの API を学ぶことができます。

- `useState()`
- `useEffect()`
- `useRef()`
- `useCallback()`
- `use()`
- `startTransition()`
- `useTransition()`
- `useDeferredValue()`
- `useMemo()`
- `useLayoutEffect()`
- `useReducer()`
- `useDebugValue()`
- `createElement()`
- `memo()`
- `isValidElement()`
- `useId()`
- `createRef()`
- `forwardRef()`
- `useImperativeHandle()`
- `useSyncExternalStore()`
- `useInsertionEffect()`
- `useFormStatus()`
- `useActionState()`
- `useOptimistic()`

## `startViewTransition()` ファミリー

`startViewTransition()` ファミリーは、 [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) を簡単に扱うためのオリジナルのフックや関数があります。 以下の例では、どのように使用するかを示しています。

### 1. とてもシンプルな例

`startViewTransition()` を使って簡単に `document.startViewTransition` を使用するトランジションを記述できます。

```tsx
import { useState, startViewTransition } from 'hono/jsx'
import { css, Style } from 'hono/css'

export default function App() {
  const [showLargeImage, setShowLargeImage] = useState(false)
  return (
    <>
      <Style />
      <button
        onClick={() =>
          startViewTransition(() =>
            setShowLargeImage((state) => !state)
          )
        }
      >
        Click!
      </button>
      <div>
        {!showLargeImage ? (
          <img src='https://hono.dev/images/logo.png' />
        ) : (
          <div
            class={css`
              background: url('https://hono.dev/images/logo-large.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              width: 600px;
              height: 600px;
            `}
          ></div>
        )}
      </div>
    </>
  )
}
```

### 2. `keyframes()` と共に `viewTransition()` を使用する

`viewTransition()` 関数を使うと、 ユニークな `view-transition-name` を取得できます。

`keyframes()` でそれを使用することができ、 `::view-transition-old()` は `::view-transition-old(${uniqueName))` に変換されます。

```tsx
import { useState, startViewTransition } from 'hono/jsx'
import { viewTransition } from 'hono/jsx/dom/css'
import { css, keyframes, Style } from 'hono/css'

const rotate = keyframes`
  from {
    rotate: 0deg;
  }
  to {
    rotate: 360deg;
  }
`

export default function App() {
  const [showLargeImage, setShowLargeImage] = useState(false)
  const [transitionNameClass] = useState(() =>
    viewTransition(css`
      ::view-transition-old() {
        animation-name: ${rotate};
      }
      ::view-transition-new() {
        animation-name: ${rotate};
      }
    `)
  )
  return (
    <>
      <Style />
      <button
        onClick={() =>
          startViewTransition(() =>
            setShowLargeImage((state) => !state)
          )
        }
      >
        Click!
      </button>
      <div>
        {!showLargeImage ? (
          <img src='https://hono.dev/images/logo.png' />
        ) : (
          <div
            class={css`
              ${transitionNameClass}
              background: url('https://hono.dev/images/logo-large.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              width: 600px;
              height: 600px;
            `}
          ></div>
        )}
      </div>
    </>
  )
}
```

### 3. `useViewTransition` を使用する

アニメーション中だけスタイルを変更したい場合、 `useViewTransition()` を使用することができます。 このフックは `[boolean, (callback: () => void) => void]` を返します。 これは `isUpdating` フラグや `startViewTransition()` 関数です。

このフックを使用する際、コンポーネントは次のような２個所のタイミングで評価されます。

- `startViewTransition()` を呼び出すコールバックの内部
- [`finish` promise が fulfilled になるとき](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition/finished)

```tsx
import { useState, useViewTransition } from 'hono/jsx'
import { viewTransition } from 'hono/jsx/dom/css'
import { css, keyframes, Style } from 'hono/css'

const rotate = keyframes`
  from {
    rotate: 0deg;
  }
  to {
    rotate: 360deg;
  }
`

export default function App() {
  const [isUpdating, startViewTransition] = useViewTransition()
  const [showLargeImage, setShowLargeImage] = useState(false)
  const [transitionNameClass] = useState(() =>
    viewTransition(css`
      ::view-transition-old() {
        animation-name: ${rotate};
      }
      ::view-transition-new() {
        animation-name: ${rotate};
      }
    `)
  )
  return (
    <>
      <Style />
      <button
        onClick={() =>
          startViewTransition(() =>
            setShowLargeImage((state) => !state)
          )
        }
      >
        Click!
      </button>
      <div>
        {!showLargeImage ? (
          <img src='https://hono.dev/images/logo.png' />
        ) : (
          <div
            class={css`
              ${transitionNameClass}
              background: url('https://hono.dev/images/logo-large.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              width: 600px;
              height: 600px;
              position: relative;
              ${isUpdating &&
              css`
                &:before {
                  content: 'Loading...';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                }
              `}
            `}
          ></div>
        )}
      </div>
    </>
  )
}
```

## `hono/jsx/dom` ランタイム

クライアントコンポーネント用の小さな JSX ランタイムがあります。 これを使用すると、 `hono/jsx` を使用するよりも小さくバンドルされた結果が返ります。 `tsconfig.json` で `hono/jsx/dom` を指定します。 Deno では、 deno.json を変更します。

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx/dom"
  }
}
```

あるいは、 `vite.config.ts` の esbuild 変換オプション内で `hono/jsx/dom` を指定することができます。

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxImportSource: 'hono/jsx/dom',
  },
})
```
