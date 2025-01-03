# 哲学

この章では、 Hono のコンセプトや哲学について説明します。

## モチベーション

始めは、 Cloudflare Workers でウェブアプリケーションを作りたいだけでした。
しかし、 Cloudflare Workers で動く良いフレームワークがありませんでした。
そのため、 Hono の開発を始めました。

I thought it would be a good opportunity to learn how to build a router using Trie trees.
Then a friend showed up with ultra crazy fast router called "RegExpRouter".
And I also have a friend who created the Basic authentication middleware.

Using only Web Standard APIs, we could make it work on Deno and Bun. When people asked "is there Express for Bun?", we could answer, "no, but there is Hono".
(Although Express works on Bun now.)

We also have friends who make GraphQL servers, Firebase authentication, and Sentry middleware.
And, we also have a Node.js adapter.
An ecosystem has sprung up.

In other words, Hono is damn fast, makes a lot of things possible, and works anywhere.
We might imagine that Hono could become the **Standard for Web Standards**.
