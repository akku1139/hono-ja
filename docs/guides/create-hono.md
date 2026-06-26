# Create-hono

`create-hono` でサポートされるコマンドラインオプションです。`npm create hono@latest`, `npx create-hono@latest`, `pnpm create hono@latest` を実行すると、プロジェクトを初期化します。

> [!NOTE]
**なぜこのページがあるのか？** インストールやクイックスタートのサンプルでは、`npm create hono@latest my-app` のような最小限のコマンドが示されています。`create-hono` はいくつかの有用なフラグをサポートしており、自動化やカスタマイズしたプロジェクト作成（テンプレートの選択・プロンプトのスキップ・パッケージマネージャの選択・ローカルキャッシュの使用など）をすることができます。

## 引数を渡す:

`npm create` (あるいは `npx`) を使用する際、初期化スクリプトに渡す引数は  `--` **の後に** 置かなければなりません。`--` の後のすべてのものが初期化スクリプトに送られます。

::: code-group

```sh [npm]
# create-hono (npm は `--` が必要です) に引数を送ります
npm create hono@latest my-app -- --template cloudflare-workers
```

```sh [yarn]
# "--template cloudflare-workers" は Cloudflare Workers テンプレートを選択します
yarn create hono my-app --template cloudflare-workers
```

```sh [pnpm]
# "--template cloudflare-workers" は Cloudflare Workers テンプレートを選択します
pnpm create hono@latest my-app --template cloudflare-workers
```

```sh [bun]
# "--template cloudflare-workers" は Cloudflare Workers テンプレートを選択します
bun create hono@latest my-app --template cloudflare-workers
```

```sh [deno]
# "--template cloudflare-workers" は Cloudflare Workers テンプレートを選択します
deno init --npm hono@latest my-app --template cloudflare-workers
```

:::

## 一般的に使用される引数

| Argument                | Description                                                                                                                                      | Example                         |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| `--template <template>` | 開始テンプレートを選択して、インタラクティブなテンプレートプロンプトをスキップします。テンプレートは、`bun`, `cloudflare-workers`, `vercel` のような名称がある可能性があります。 | `--template cloudflare-workers` |
| `--install`             | テンプレートを生成後に、自動的に依存関係をインストールします。                                                                                        | `--install`                     |
| `--pm <packageManager>` | 依存関係をインストールする際に、どのパッケージマネージャを実行するかを指定します。一般的な値: `npm`, `pnpm`, `yarn`                                      | `--pm pnpm`                     |
| `--offline`             | 最新のリモートテンプレートを取得する代わりに、ローカルのキャッシュまたはテンプレートを使用します。オフライン環境やローカル実行が決まっている場合に有用です。   | `--offline`                     |

> [!NOTE]
> 正確なテンプレートのセットや有効なオプションは、 `create-hono` プロジェクトでメンテナンスされています。この文書では、よく使用されるフラグをまとめています。完全で信頼のあるリファレンスは、以下のリポジトリを参照してください。

## フローのサンプル

### インタラクティブを最小限に

```bash
npm create hono@latest my-app
```

これはテンプレートとオプションを掲示します。

### インタラクティブなしで、テンプレートとパッケージマネージャを選択する

```bash
npm create hono@latest my-app -- --template vercel --pm npm --install
```

これは、`vercel` テンプレートを使用して `my-app` を生成し、`npm` を使用して依存関係をインストールします。インタラクティブなプロンプトはスキップします。

### オフラインキャッシュを使用する (ネットワークを使用しない)

```bash
pnpm create hono@latest my-app --template deno --offline
```

## トラブルシューティングとコツ

- オプションが認識されていない場合、`npm create` / `npx` を使用する際に `--` でオプションを送っているかどうかを確認してください
- テンプレートやフラグの最新のリストを確認するには、`create-hono` リポジトリを確認するか、ローカルで初期化スクリプトを実行してヘルプの出力に従ってください

## リンクとリファレンス

- `create-hono` repository : [create-hono](https://github.com/honojs/create-hono)
