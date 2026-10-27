# コーディングエージェント向けの Hono

Hono はコーディングエージェントに適しています。 API は小さく、 Web 標準に基づいて構築されているため、エージェントはその大部分をすでに知っています。 このページでは、エージェントが Hono でうまく動作するために私たちが提供するものを一覧します。

## はじめに

プロジェクトを作成し、その中でエージェントを実行してください。

```sh
npm create hono@next my-app
```

テンプレートには、エージェントが必要とするものが含まれています: アプリの確認方法をエージェントに伝える `AGENTS.md` と、開発依存関係としての [Hono CLI](/docs/agents/cli) です。 他に設定するものはありません。

## エージェント向けのドキュメント

このサイトのすべてのページは Markdown として利用できます。 `Accept: text/markdown` ヘッダーで取得してください:

```sh
curl -H 'Accept: text/markdown' https://hono.dev/docs/api/routing
```

適切なページを見つけるには、 [`/llms.txt`](/llms.txt) から始めてください。 そこには、各ページが一行の説明とともに一覧されています。 [`/llms-full.txt`](/llms-full.txt) にはドキュメント全体が一つのファイルにまとめられており、 [`/llms-small.txt`](/llms-small.txt) はより短いバージョンです。

## Hono Skills

[Hono Skills](https://github.com/honojs/skills) は Hono 用の [Agent Skills](https://agentskills.io) です。 `hono` スキルは、エージェントにインラインの API リファレンスと Hono CLI でリクエストをテストする方法を提供します。 `hono-jsx` スキルは `hono/jsx` を使った UI をカバーします。

[skills.sh](https://skills.sh) または [GitHub CLI](https://cli.github.com) でインストールしてください。 どちらも、エージェントが読み取る場所にスキルを配置します。

```sh
# skills.sh
npx skills add honojs/skills

# GitHub CLI
gh skill install honojs/skills hono
gh skill install honojs/skills hono-jsx
```

## Hono CLI

[Hono CLI](/docs/agents/cli) はアプリを直接読み込むため、エージェントはサーバーを起動せずに検査およびテストできます。 すべてのコマンドは JSON を出力します。

```sh
hono routes          # all routes, without reading the source
hono request /users  # one request, through app.request()
hono batch -         # many requests with expectations, until "failed": 0
hono snapshot        # the current behavior, as batch lines
hono diff            # what changed vs the last commit
```

`hono --help` はエージェント向けの注記から始まり、 `hono <command> --help` には例があります。 他に設定は必要ありません。

## AGENTS.md

エージェントは、プロジェクトが実行方法や確認方法として指定した方法に従います。 `AGENTS.md` の一行で、開発サーバーの代わりに Hono CLI を使わせることができます。 エージェントは残りを `hono --help` から学びます。 create-hono のテンプレートにはすでに含まれています。

```md
## Hono CLI

まず `npx hono --help` を実行し、開発サーバーの代わりに CLI を使用してください。
```

または、エージェントに直接伝えてください。 同じ一行がプロンプトとして機能します。

## エージェントは Hono をどの程度うまく使えますか?

私たちはそれを計測しています。 結果は [Agent DX](https://agent-dx.hono.dev) をご覧ください。
