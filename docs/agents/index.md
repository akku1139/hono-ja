# コーディングエージェント向けの Hono

Hono はコーディングエージェントに適しています。 API は小さく Web Standards に基づいているため、エージェントはそのほとんどをすでに知っています。 このページでは、エージェントが Hono でうまく動作するために提供しているものを一覧にしています。

## はじめに

プロジェクトを作成し、その中でエージェントを実行します。

```sh
npm create hono@next my-app
```

テンプレートにはエージェントが必要とするものが含まれています: アプリの確認方法をエージェントに伝える `AGENTS.md` と、開発依存関係としての [Hono CLI](/docs/agents/cli) です。 他に設定することはありません。

## エージェント向けドキュメント

このサイトのすべてのページは Markdown として利用できます。 `Accept: text/markdown` ヘッダーで取得してください:

```sh
curl -H 'Accept: text/markdown' https://hono.dev/docs/api/routing
```

適切なページを見つけるには、[`/llms.txt`](/llms.txt) から始めてください。 すべてのページが一行説明付きで一覧されています。 [`/llms-full.txt`](/llms-full.txt) にはドキュメント全体が一つのファイルに、 [`/llms-small.txt`](/llms-small.txt) は短縮版です。

## Hono Skills

[Hono Skills](https://github.com/honojs/skills) は Hono 向けの [Agent Skills](https://agentskills.io) です。 `hono` スキルはエージェントにインラインの API リファレンスと Hono CLI を使ったリクエストのテスト方法を与えます。 `hono-jsx` スキルは `hono/jsx` を使った UI をカバーします。

[skills.sh](https://skills.sh) または [GitHub CLI](https://cli.github.com) でインストールします。 どちらもエージェントが読み取る場所にスキルを配置します。

```sh
# skills.sh
npx skills add honojs/skills

# GitHub CLI
gh skill install honojs/skills hono
gh skill install honojs/skills hono-jsx
```

## Hono CLI

[Hono CLI](/docs/agents/cli) はアプリを直接読み込むため、エージェントはサーバーを起動せずに検査・テストできます。 すべてのコマンドは JSON を出力します。

```sh
hono routes          # all routes, without reading the source
hono request /users  # one request, through app.request()
hono batch -         # many requests with expectations, until "failed": 0
hono snapshot        # the current behavior, as batch lines
hono diff            # what changed vs the last commit
```

`hono --help` はエージェント向けの注記から始まり、 `hono <command> --help` には例があります。 他に設定は不要です。

## AGENTS.md

エージェントはプロジェクトが実行・確認方法として指定した方法に従います。 `AGENTS.md` に一行書くだけで、開発サーバーの代わりに Hono CLI を使うようになります。 エージェントは残りを `hono --help` から学びます。 create-hono のテンプレートにはすでに含まれています。

```md
## Hono CLI

Run `npx hono --help` first, and use the CLI instead of a dev server.
```

またはエージェントに直接伝えてください。 同じ一行がプロンプトとしても機能します。

## エージェントは Hono をどれだけうまく使えるか?

私たちはそれを計測しています。 結果は [Agent DX](https://agent-dx.hono.dev) を参照してください。
