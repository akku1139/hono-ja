# Hono CLI

Hono CLI (`hono`) は Hono のコマンドラインツールで、コーディングエージェント向けに作られています。 Hono アプリを直接読み込むため、エージェントはサーバーを起動せずにアプリを検査・テストできます。 コマンドはデフォルトで JSON を出力します。 人間が読むときは `routes`, `request`, `benchmark`, `ssg` に `--plain` を指定します。

## インストール

プロジェクトにインストールします。 コーディングエージェントは `package.json` からそれを見つけます。

```sh
npm install -D @hono/cli
```

またはグローバルに:

```sh
npm install -g @hono/cli
```

## 出力

コマンドは JSON を標準出力に出力します。 `snapshot` は代わりにバッチ JSONL 行を出力します。

- 成功: `{ "ok": true, "data": ... }` 終了コード 0
- 失敗: `{ "ok": false, "error": { "code", "message", "suggestions", "docs" } }` 終了コード 1

失敗時、`error.suggestions` は次に試すべきことを示し、`error.docs` はこのサイトのページを指します。 ログは標準エラー出力に出力されます。

`hono --help` はコーディングエージェント向けの短い注記から始まり、`hono <command> --help` には各コマンドの例と注記があります。 エージェントが CLI を使うために必要なものは他にありません。

## コマンド

| コマンド                      | 内容                                           |
| ---------------------------- | ------------------------------------------------------ |
| `hono routes [file]`         | Hono アプリのルートを表示します                           |
| `hono request [path] [file]` | `app.request()` を使ってアプリにリクエストを送信します       |
| `hono batch <source> [file]` | JSONL から複数のリクエストを `app.request()` で実行します |
| `hono snapshot [file]`       | 現在の挙動をバッチ JSONL 行として出力します        |
| `hono diff`                  | 未コミットの変更がアプリに与える影響を表示します              |
| `hono benchmark [file]`      | Hono アプリのパフォーマンスを計測します               |
| `hono ssg [file]`            | Hono アプリから静的ファイルを生成します               |
| `hono init`                  | 現在のディレクトリに Hono アプリを追加します                |

`file` はアプリファイルへのパスです。 省略された場合、アプリは `src/index.ts`, `src/index.tsx`, `src/index.js`, または `src/index.jsx` から見つけられます。 TypeScript と JSX がサポートされています。

### routes

Hono アプリのすべてのルートを表示します。 [`showRoutes()`](/docs/helpers/dev#showroutes) のように。 ルートは実際のアプリインスタンスから解決されるため、マウントされたサブアプリや `basePath` が展開されます。

```sh
hono routes
hono routes --verbose src/app.ts
```

- `--verbose` - ミドルウェアを含める
- `--plain` - JSON の代わりに人間が読みやすい出力
- `-e, --external <package>` - パッケージを外部としてマークする (複数回使用可能)

```json
{
  "ok": true,
  "data": {
    "router": "SmartRouter + RegExpRouter",
    "routes": [
      {
        "method": "GET",
        "path": "/",
        "name": "[handler]",
        "isMiddleware": false
      },
      {
        "method": "POST",
        "path": "/posts",
        "name": "[handler]",
        "isMiddleware": false
      }
    ]
  }
}
```

### request

`app.request()` を通じてアプリにリクエストを送信します。 サーバーは不要です。 `path` のデフォルトは `/` です。

```sh
hono request /
hono request /users/123
hono request /api/users -X POST -d '{"name":"Alice"}'
hono request /todos -X POST -d 'title=milk'
hono request /api/protected -H 'Authorization: Bearer token'
cat payload.json | hono request /api/users -X POST -d @-
hono request /api/users/123 --trace
hono request / --runtime bun
```

- `-X, --method <method>` - HTTP メソッド (デフォルト: `GET`)
- `-d, --data <data>` - リクエストボディ (`@file` はファイルを読み、`@-` は標準入力を読みます)。 JSON オブジェクトまたは配列は JSON として、それ以外はフォームとして送信されます。 ただし `-H` で `Content-Type` を設定した場合は除きます。
- `-H, --header <header>` - カスタムヘッダー (複数回使用可能)
- `--trace` - マッチしたルートを出力に含める
- `--runtime <runtime>` - アプリを `node` (デフォルト), `bun`, `deno`, `workerd`, または `vite` で実行する
- `--compact` - ヘッダーなしの一行 JSON
- `--no-bindings` - ローカルの Cloudflare バインディングの読み込みをスキップする
- `-w, --watch` - 変更を監視し、リクエストを再送する
- `-o, --output <file>` - レスポンスボディをファイルに書き込む
- `--plain` - curl のように生のボディを出力する (`-i` はステータスとヘッダーを追加、`-I` はそれらのみ表示)

JSON レスポンスボディはオブジェクトとして埋め込まれます:

```json
{
  "ok": true,
  "data": {
    "status": 200,
    "headers": { "content-type": "application/json" },
    "body": { "message": "Hello World" }
  }
}
```

`--trace` を使うと、出力に `matchedRoutes` が含まれます: どのミドルウェアとハンドラーがマッチし、どれが応答したかです。 404 の結果はそれを実行することを示唆します。

`-` をファイルとして標準入力からアプリコードを渡すこともできます。 `app` は事前定義され、あなたのためにエクスポートされています:

```sh
echo 'app.get("/hello", (c) => c.json({ ok: true }))' | hono request /hello -
```

#### Cloudflare バインディング

wrangler 設定があるプロジェクトでは、`c.env` が実際のローカルバインディング (KV, D1, R2, vars) を自動的に持ち、アプリは Node.js 上で実行されます。 これは `request`, `batch`, `snapshot`, `ssg` で動作します。 `--no-bindings` でスキップできます。 プロジェクトに [wrangler](https://developers.cloudflare.com/workers/wrangler/) がインストールされている必要があります。

`--runtime workerd` は代わりに wrangler 設定と共にアプリ全体を workerd 内で実行します。 より重くなりますが、完全なランタイムです。 エントリは wrangler 設定の `main` なので、ファイル引数は渡さないでください。

#### Vite

`--runtime vite` は Vite プラグインがビルドするアプリ向けに、プロジェクトの Vite 開発サーバーを通してリクエストを送信します。 アプリは Vite 設定から取得されるため、ファイル引数は渡さないでください。 `cloudflare.config.ts` と Vite 設定があるプロジェクトでは `c.env` にバインディングがあり、デフォルトになります。 また `src/index.ts` がない Vite プロジェクトでもデフォルトです。 これは `request`, `batch`, `snapshot` で動作します。 ファイル引数、`--no-bindings`, `--trace`, `--watch` を指定すると、代わりに Node.js 上でアプリが実行されます。

### batch

JSONL から複数のリクエストを一回の呼び出しで順番に、一つのアプリインスタンスに対して実行します。 メモリ内状態はステップ間で引き継がれます。

```sh
hono batch - <<'JSONL'
{"path":"/users","expect":{"status":200}}
{"method":"POST","path":"/users","body":{"name":"Momo"},"expect":{"status":201,"body":{"name":"Momo"}},"save":{"id":".id"}}
{"path":"/users/{{id}}","expect":{"status":200}}
{"method":"DELETE","path":"/users/{{id}}","expect":{"status":204}}
JSONL
```

一行に一つの JSON オブジェクト: `method`, `path`, `body`, `headers`, `expect`, `save`。

- `expect` は受け入れ基準を宣言します。 `status` は完全一致です。 `body` は深い部分一致です: 宣言されたフィールドがマッチする必要があり、レスポンスの余分なフィールドは無視されます。
- `save` はドットパスでレスポンスボディから値を保存し、後のステップで `{{id}}` として使用します。
- 文字列の `body` はフォームとして送信されます。 または JSON オブジェクトや配列の場合は JSON として送信されます。 ただし `headers` でコンテンツタイプを設定した場合は除きます。 オブジェクトの `body` は JSON として送信されます。
- Cookie はブラウザのように引き継がれます。 Cookie を設定するログインステップは、その後のステップをサインイン状態にします。 ステップ内の `cookie` ヘッダーが優先されます。
- `expect` のないステップは 2xx または 3xx で合格し、4xx または 5xx で失敗します。 意図的に 4xx を受け入れるには、`expect.status` で宣言してください。
- 失敗したステップは `diff` を持ち、不一致ごとに一行です。

出力には各ステップの実際の `status` と `body`、ステップごとの `pass`、`summary` が含まれます。 `failed` が 0 になるまで再実行してください。

- `-H, --header <header>` - すべてのステップに共有されるヘッダー
- `--compact` - 失敗したステップとサマリーのみを出力する
- `--runtime <runtime>` - `node` (default), `workerd`, or `vite`
- `--no-bindings` - ローカルの Cloudflare バインディングの読み込みをスキップする

### snapshot

アプリの現在の挙動をバッチ JSONL 行として標準出力に出力します。 ファイルは書き込まれません。

```sh
hono snapshot
hono snapshot --status-only src/app.ts
```

パラメータなしの GET ルートが実行され、その実際のステータスとボディが `expect` になります。 パラメータ付きの GET ルートは、アプリがすでにリンクやパラメータ名を持つ JSON フィールドでそのパスを示していた場合に実行されます。 その他のパラメータ付きルートと非 GET ルートは `expect` なしで出力されるため、あなたが記入します。 一つのプローブ行が、どのルートにもマッチしないパスのレスポンスを記録します。

`routes` とは異なり、このコマンドは実際のリクエストを送信するため、ミドルウェアが実行されます。

リファクタリング前にキャプチャし、`failed` が 0 になるまで `hono batch` で行を再実行してください。

- `--status-only` - ボディではなくステータスコードのみをキャプチャする
- `--runtime <runtime>` - `node` (default), `workerd`, or `vite`
- `--no-bindings` - ローカルの Cloudflare バインディングの読み込みをスキップする

### diff

未コミットの変更がアプリに何をするかを表示します。 最後のコミット時と現在のアプリを実行し、答えを比較します。 事前のキャプチャは不要です。

```sh
hono diff
hono diff --base main
```

- `--base <ref>` - 比較対象のコミット (デフォルト: `HEAD`)

`hono snapshot` が実行する GET ルートと 404 プローブが両側で実行されます。 `changed` は、ステータスとボディの差異と共に、異なる応答をしたものを一覧にします。 出現または消失したルートは `added` と `removed` に入ります。 その他のパラメータ付きルートと非 GET ルートは実行されないため、`hono batch` で確認してください。

各側は最新のローカルデータを持つ一時的な git worktree で実行されるため、テスト中に書き込んだデータはカウントされません。 `node_modules` は共有され、`.dev.vars` はコピーされます。 リファクタリング後の空の `changed` は、GET ルートが以前と同じ応答をすることを意味します。

```json
{
  "ok": true,
  "data": {
    "base": "HEAD",
    "compared": 6,
    "changed": [
      { "route": "GET /api/posts", "status": "200 -> 401" }
    ],
    "added": ["POST /login"],
    "removed": []
  }
}
```

### benchmark

Hono アプリのパフォーマンスを計測します。 ルーティングとハンドラーのマイクロベンチマークです: `app.request()` が HTTP スタックやネットワークなしで直接呼び出されます。 各実行は新しいプロセスで行われるため、結果は比較可能です。

```sh
hono benchmark
hono benchmark -P /users
hono benchmark -P /users -X POST -d '{"name":"Alice"}' -H 'Content-Type: application/json'
hono benchmark --hono 4.12.3 --hono 4.13.0
hono benchmark --hono ../hono
```

- `-P, --path <path>` - このパスのみをベンチマークする (複数回使用可能)
- `-X`, `-d`, `-H` - `-P` パス用のメソッド、ボディ、ヘッダー
- `--duration <ms>` - 各ルートを計測する時間 (デフォルト: `500`)
- `--warmup <count>` - 計測前のリクエスト数 (デフォルト: `30`)
- `--hono <version-or-path>` - 別の Hono で同じアプリをベンチマークする: npm バージョン、またはローカルチェックアウト

数パーセントの差はノイズです。 比較するには、複数回実行し、差が繰り返されるか確認してください。

### ssg

Hono アプリから静的ファイルを生成します。 [SSG ヘルパー](/docs/helpers/ssg) のように。

```sh
hono ssg
hono ssg -o dist/static src/app.ts
hono ssg --exclude '/api/*'
```

- `-o, --outdir <dir>` - 出力ディレクトリ (デフォルト: `static`)
- `--include <path>` / `--exclude <path>` - パスでルートを選択する。 `*` は任意にマッチする
- `--no-bindings` - ローカルの Cloudflare バインディングの読み込みをスキップする

200 を返さないページは書き込まれません。 そのステータスと共に `skipped` に一覧されるため、`hono request <path>` で確認してください。

```json
{
  "ok": true,
  "data": {
    "output": "static",
    "files": ["static/index.html", "static/about.html"],
    "skipped": [{ "path": "/counter", "status": 500 }]
  }
}
```

### init

[create-hono](/docs/guides/create-hono) テンプレートから Hono アプリを現在のディレクトリに追加します。 `npm create hono` が使えない、すでに存在するプロジェクトで使用します。

```sh
npm install -D @hono/cli
npx hono init --template cloudflare-workers --install
npx hono request /
```

- `-t, --template <template>` - テンプレート。 `aws-lambda`, `bun`, `cloudflare-workers`, `deno`, `fastly`, `lambda-edge`, `netlify`, `nextjs`, `nodejs`, `vercel`, `x-basic` のいずれか
 - `-i, --install` - ロックファイルから、または `hono` を起動したコマンドからパッケージマネージャーで依存関係をインストールする

`--template` なしでは、テンプレートはディレクトリ内のファイルから決まります: `wrangler.jsonc` または `cloudflare.config.ts` は `cloudflare-workers`、`deno.json` は `deno`、`bun.lock` は `bun`、などです。 ヒントがない場合、ターミナルには選択リストが表示されます。 ターミナルがない場合、エラーがテンプレートを一覧します。

すでに存在するファイルは決して上書きされません。 それは `skipped` に一覧されます。 `package.json` はマージされ、既存の値が優先されますが、`type` はテンプレートが `module` に設定します。 wrangler 設定がある場合、テンプレートは `cloudflare.config.ts` を追加しません。 逆も同様です。 `--install` なしでは、次にパッケージマネージャーを実行してください。

```json
{
  "ok": true,
  "data": {
    "template": "cloudflare-workers",
    "detectedFrom": "wrangler.jsonc",
    "written": ["src/index.ts"],
    "skipped": ["wrangler.jsonc"]
  }
}
```
