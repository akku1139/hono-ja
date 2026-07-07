# WebAssembly (w/ WASI)

[WebAssembly][wasm-core] は、安全なサンドボックス化されたポータブルなランタイムです。ウェブブラウザの内部でも外部でも動作します。

実際に:

- (JavaScript のような) 言語は、 WebAssembly (`.wasm` ファイル) に _コンパイルする_
- ([`wasmtime`][wasmtime] や [`jco`][jco] のような) WebAssembly ランタイムは、 WebAssembly バイナリを _実行_ することができる

WebAssembly のコアは、ローカルのファイルシステムやソケットなどにアクセス _しない_ ですが、 [WebAssembly System Interface][wasi] が、 WebAssembly のワークロード配下のプラットフォームを定義できる役割を担っています。

WASI _を持っている_ WebAssembly は、ファイルやソケットなどを操作することができるということです。

::: info
WASI インタフェースをご自身で確認してみたいですか？ [`wasi:http`][wasi-http] をチェックしてみてください。
:::

JavaScript における WebAssembly w/ WASI のサポートは、 [StarlingMonkey][sm] によって実現されています。 StarlingMonkey と Hono どちらもウェブ標準を重視しています。**Hono は、 WASI が有効な WebAssembly エコシステムにおいてすぐに動作します。**

[sm]: https://github.com/bytecodealliance/StarlingMonkey
[wasm-core]: https://webassembly.org/
[wasi]: https://wasi.dev/
[bca]: https://bytecodealliance.org/
[wasi-http]: https://github.com/WebAssembly/wasi-http

## 1. セットアップ

WebAssembly の JavaScript エコシステムは、簡単に WASI が有効な WebAssembly コンポーネントを構築し始めるためのツールを提供しています:

- [StarlingMonkey][sm] は、 [SpiderMonkey][spidermonkey] のフォークです。 WebAssembly にコンパイルしコンポーネントを有効にします。
- [`componentize-js`][componentize-js] は、 JavaScript ES modules を WebAssembly コンポーネントに変換します。
- [`jco`][jco] はマルチツールで、コンポーネントをビルドし、型を生成し、Node.js やブラウザのような環境でコンポーネントを実行します。

::: info
WebAssembly オープンなエコシステムがあり、オープンソースです。コアプロジェクトでは、 [Bytecode Alliance][bca] やそのメンバーによって管理されています。

新しい機能、イシュー、プルリクエストやその他の貢献などは、常に歓迎されます。
:::

WebAssembly 上で動作する Hono についてのスタータはまだ利用可能ではありませんが、他のプロジェクトと同様に WebAssembly を使った Hono プロジェクトを開始することができます:

::: code-group

```sh [npm]
mkdir my-app
cd my-app
npm init
npm i hono
npm i -D @bytecodealliance/jco @bytecodealliance/componentize-js @bytecodealliance/jco-std
npm i -D rolldown
```

```sh [yarn]
mkdir my-app
cd my-app
npm init
yarn add hono
yarn add -D @bytecodealliance/jco @bytecodealliance/componentize-js @bytecodealliance/jco-std
yarn add -D rolldown
```

```sh [pnpm]
mkdir my-app
cd my-app
pnpm init --init-type module
pnpm add hono
pnpm add -D @bytecodealliance/jco @bytecodealliance/componentize-js @bytecodealliance/jco-std
pnpm add -D rolldown
```

```sh [bun]
mkdir my-app
cd my-app
npm init
bun add hono
bun add -D @bytecodealliance/jco @bytecodealliance/componentize-js @bytecodealliance/jco-std
```

:::

::: info
プロジェクトで ES modules を使用するには、 `package.json` 内で、 `type` が `"module"` にセットされていることを確認してください。
:::

`my-app` フォルダに移動した後、依存関係をインストールし、 TypeScript を初期化します:

::: code-group

```sh [npm]
npm i
npx tsc --init
```

```sh [yarn]
yarn
yarn tsc --init
```

```sh [pnpm]
pnpm i
pnpm exec tsc --init
```

```sh [bun]
bun i
```

:::

基本的な TypeScript の設定ファイル (`tsconfig.json`) を作成したら、次の設定があることを確認してください:

- `compilerOptions.module` が `"nodenext"` にセットされている

`componentize-js` (とそれを再利用する `jco`) は、単一の Javascript ファイルしかサポートしないため、バンドルすることが必須ですが、単一のバンドルファイルを生成するために、 [`rolldown`][rolldown] を使用することができます。

次のような Rolldown (`rolldown.config.mjs`) 設定を使用することができます:

```js
import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/component.ts',
  external: /wasi:.*/,
  output: {
    file: 'dist/component.js',
    format: 'esm',
  },
})
```

::: info
(`rolldown`, `esbuild`, `rollup` など) 使い慣れている他のバンドラを自由に使用してください。
:::

[jco]: https://github.com/bytecodealliance/jco
[componentize-js]: https://github.com/bytecodealliance/componentize-js
[rolldown]: https://rolldown.rs
[spidermonkey]: https://spidermonkey.dev/

## 2. WIT インタフェースや依存関係をセットアップする

[WebAssembly Interface Types (WIT)][wit] は、インタフェース定義言語 ("IDL") です。WebAssembly コンポーネントが、どの機能を使用するか ("imports") や何を提供するか ("exports") を管理します。

標準化された WIT インタフェースのうち、 [`wasi:http`][wasi-http] は HTTP リクエスト (リクエストを受け取るかまたはリクエストを送るか) を扱うためのものです。ウェブサーバを作成するにあたり、コンポーネントは、 [WIT world][wit-world] において `wasi:http/incoming-handler` を使用することを宣言しなければなりません。

まず初めに、 `wit/component.wit` という名前のファイルで、コンポーネントの WIT world をセットアップします:

```txt
package example:hono;

world component {
    export wasi:http/incoming-handler@0.2.6;
}
```

簡単に言うと、上記の WIT ファイルは、コンポーネントが HTTP リクエストを "受信する"/"処理する" という機能を提供することを意味しています。

`wasi:http/incoming-handler` インタフェースは、上流の標準化された WIT インタフェース (リクエストの構造についての仕様など) に依存しています。

サードパーティ製 (Bytecode Alliance がメンテナンスしている) の WIT インタフェースを取得するために、利用できるツールの１つは [`wkg`][wkg] になります:

```sh
wkg wit fetch
```

`wkg` は実行が終わると、 `wit` フォルダ内に `component.wit` と並んで、新しい `deps` フォルダが作成されていることがわかります:

```
wit
├── component.wit
└── deps
    ├── wasi-cli-0.2.6
    │   └── package.wit
    ├── wasi-clocks-0.2.6
    │   └── package.wit
    ├── wasi-http-0.2.6
    │   └── package.wit
    ├── wasi-io-0.2.6
    │   └── package.wit
    └── wasi-random-0.2.6
        └── package.wit
```

[wkg]: https://github.com/bytecodealliance/wasm-pkg-tools
[wit-world]: https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md#wit-worlds
[wit]: https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md

## 3. Hello Wasm

WebAssembly で HTTP サーバをビルドするために、 [`jco-std`][jco-std] プロジェクトを使用することができます。ヘルパーが含まれていて、標準的な Hono の体験と似たような体験をすることができます。

`src/component.ts` という名前のファイル内に WebAssembly コンポーネントとして基本的な Hono アプリケーションをもつ `component` world を構築してみましょう:

```ts
import { Hono } from 'hono'
import { fire } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server'

const app = new Hono()

app.get('/hello', (c) => {
  return c.json({ message: 'Hello from WebAssembly!' })
})

fire(app)

// 上記で wasi HTTP が設定されている `fire()` をコールしていますが、
// 実際には `wasi:http/incoming-handler` インタフェースオブジェクトをエクスポートする必要があります
// それは jco や componentize-js が WASI インタフェースにマッチしている ES module のエクスポートを検索しているからです。
export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server'
```

## 4. ビルド

Rolldownを使用している (また、TypeScript のコンパイルを処理するように設定されている) ので、ビルドやバンドルするのに使用することができます:

::: code-group

```sh [npm]
npx rolldown -c
```

```sh [yarn]
yarn rolldown -c
```

```sh [pnpm]
pnpm exec rolldown -c
```

```sh [bun]
bun build --target=bun --outfile=dist/component.js ./src/component.ts
```

:::

::: info
バンドルすることが必要です。WebAssembly JavaScript エコシステムツールは現在のところ単一の JavaScript ファイルしかサポートしておらず、関連したライブラリとともに Hono を含めたいためです。

よりシンプルな要件のコンポーネントの場合、バンドらは必要ありません。
:::

WebAssembly コンポーネントをビルドするために、 `jco` (と間接的に `componentize-js`) を使用します:

::: code-group

```sh [npm]
npx jco componentize -w wit -o dist/component.wasm dist/component.js
```

```sh [yarn]
yarn jco componentize -w wit -o dist/component.wasm dist/component.js
```

```sh [pnpm]
pnpm exec jco componentize -w wit -o dist/component.wasm dist/component.js
```

```sh [bun]
bun run jco componentize -w wit -o dist/component.wasm dist/component.js
```

:::

## 5. Run

Hono WebAssembly HTTP サーバを実行するために、 WASI が使用可能な WebAssembly ランタイムを使用することができます:

- [`wasmtime`][wasmtime]
- `jco` (Node.js で実行)

ここでは、すでにインストールされているので、 `jco serve` を使用します。

::: warning
`jco serve` は開発用であることを示しています。本番用には推奨されません。
:::

[wasmtime]: https://wasmtime.dev

::: code-group

```sh [npm]
npx jco serve dist/component.wasm
```

```sh [yarn]
yarn jco serve dist/component.wasm
```

```sh [pnpm]
pnpm exec jco serve dist/component.wasm
```

```sh [bun]
bun run jco serve dist/component.wasm
```

:::

次のように出力されるでしょう:

```
$ npx jco serve dist/component.wasm
Server listening @ localhost:8000...
```

`localhost:8000/hello` にリクエストを送ると、 Hono アプリケーションでしていした JSON を出力します。

次のように出力されるでしょう:

```json
{ "message": "Hello from WebAssembly!" }
```

::: info
`jco serve` は、 WebAssembly コンポーネントを基本的な WebAssembly コアモジュールに変換することで動作します。このため、Node.js やブラウザのようなランタイム上で動作します。

通常このプロセスは、`jco transpile` を通して実行され、WebAssembly コンポーネントのランタイムとして Node.js やブラウザのような Javascript エンジンを使用することができる方法です。

`jco transpile` がどのように動作するかについては、このガイドの範囲外です。[the Jco book][jco-book] で詳細について読んでください。
:::

## その他の情報

WASI や WebAssembly コンポーネントなどについて学ぶためには、次のリソースを参照してください:

- [BytecodeAlliance Component Model book][cm-book]
- [`jco` codebase][jco]
  - [`jco` example components][jco-example-components] (in particular the [Hono example][jco-example-component-hono])
- [Jco book][jco-book]
- [`componentize-js` codebase][componentize-js]
- [StarlingMonkey codebase][sm]

WebAssemblyコミュニティに、質問やコメントや貢献、あるいは問題の報告などで連絡を取るには：

- [Bytecode Alliance Zulip](https://bytecodealliance.zulipchat.com) (consider posting in the [#jco channel](https://bytecodealliance.zulipchat.com/#narrow/channel/409526-jco))
- [Jco repository](https://github.com/bytecodealliance/jco)
- [componentize-js repository](https://github.com/bytecodealliance/componentize-js)

[cm-book]: https://component-model.bytecodealliance.org/
[jco-book]: https://bytecodealliance.github.io/jco/
[jco-example-components]: https://github.com/bytecodealliance/jco/tree/main/examples/components
[jco-example-component-hono]: https://github.com/bytecodealliance/jco/tree/main/examples/components/http-server-hono
