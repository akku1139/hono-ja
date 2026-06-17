---
title: Hono - Web 標準に基づいた Web フレームワーク
titleTemplate: ':title'
head:
  - [
      'meta',
      {
        property: 'og:description',
        content: 'Hono は、Web 標準に基づいた、小さく、シンプルで、爆速な Web フレームワークです。 Cloudflare Workers 、 Fastly Compute 、 Deno 、 Bun 、 Vercel 、 Netlify 、 AWS Lambda 、 Lambda@Edge そして Node.js で動作します。 速いですが、それだけではありません。',
      },
    ]
layout: home
hero:
  name: Hono
  text: Webアプリケーションフレームワーク
  tagline: 高速、 軽量、 Web 標準。 あらゆる JavaScript ランタイムをサポートします。
  image:
    src: /images/code.webp
    alt: "An example of code for Hono. \
      import { Hono } from 'hono' \
      const app = new Hono() \
      app.get('/', (c) => c.text('Hello Hono!')) \

      export default app"
  actions:
    - theme: brand
      text: Get Started
      link: /docs/
    - theme: alt
      text: GitHub
      link: https://github.com/honojs/hono
features:
  - icon: 🚀
    title: 爆速 & 軽量
    details: RegExpRouter は超高速なルーターです。 hono/tiny プリセットはわずか 14kB。 Web 標準 API のみを使用します。
  - icon: 🌍
    title: マルチランタイム
    details: Cloudflare 、 Fastly 、 Deno 、 Bun 、 AWS また Node.js で動作します。 同じコードが全てのプライベートで使用できます。
  - icon: 🔋
    title: バッテリー同梱
    details: Hono にはビルドインミドルウェア、カスタムミドルウェア、サードパーティーミドルウェアそしてヘルパーがあります。 バッテリー同梱。
  - icon: 😃
    title: 楽しい開発体験
    details: 超クリーンな API。 最高級の TypeScript サポート。 Now, we've got "Types".
---
