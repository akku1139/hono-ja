// scripts/translate-upstream.ts
//
// 実行ブランチの Markdown ファイルを LLM で日本語に翻訳します。
// upstream は translation-lint の行数チェックにのみ使用します。
//
// 使い方:
//   node ./scripts/translate-upstream.ts [--base <git-ref>] [--upstream <git-ref>]
//       [--files <glob>] [--dry-run] [--max-files <n>]
//
// 環境変数:
//   LLM_BASE_URL  - API のベース URL (必須)
//   LLM_MODEL     - モデル名 (必須)
//
// 翻訳結果は translation-lint と prettier で検証します。

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Args = {
  base?: string
  upstream: string
  files?: string
  file?: string
  dryRun: boolean
  maxFiles: number
  noFetch: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    upstream: 'upstream/main',
    dryRun: false,
    maxFiles: 50,
    noFetch: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base') args.base = argv[++i]
    else if (a === '--upstream') args.upstream = argv[++i]
    else if (a === '--files') args.files = argv[++i]
    else if (a === '--file') args.file = argv[++i]
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--max-files') args.maxFiles = Number(argv[++i])
    else if (a === '--no-fetch') args.noFetch = true
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node ./scripts/translate-upstream.ts [options]
  --base <ref>       翻訳元の基準 ref (デフォルト: HEAD と upstream の merge-base)
  --upstream <ref>   翻訳元 ref (デフォルト: upstream/main)
  --files <glob>     対象ファイルの glob (デフォルト: docs/**/*.md examples/**/*.md)
  --file <path>      指定したファイルのみを翻訳 (変更有無に関わらず)
  --dry-run          実際には書き込まずに対象ファイルを表示
  --max-files <n>    一度に処理する最大ファイル数 (デフォルト: 50)
  --no-fetch         upstream の fetch を行わない`)
      process.exit(0)
    }
  }
  return args
}

function git(...args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

function ensureUpstreamRemote() {
  try {
    git('remote', 'get-url', 'upstream')
  } catch {
    git(
      'remote',
      'add',
      'upstream',
      'https://github.com/honojs/website.git'
    )
  }
}

const CONTRIBUTING = existsSync('CONTRIBUTING.md')
  ? readFileSync('CONTRIBUTING.md', 'utf8')
  : ''

const SYSTEM_PROMPT = `You are a translator for the hono-ja project (Japanese localization of hono.dev).

Translate the given English Markdown into Japanese, following these rules strictly:

1. Line count must be EXACTLY the same as the English source. One English line -> one Japanese line. Do not add or remove lines, including blank lines.
2. Preserve all Markdown structure: headings, code fences, tables, containers (:::), frontmatter. Keep code blocks and inline code unchanged (do not translate code).
3. Follow the translation rules in CONTRIBUTING.md (embedded below).
4. Use the current Japanese translation (if provided) as a reference; keep good existing translations, but update to match the English source.
5. Output ONLY the translated Markdown. No explanations, no code fence wrapping the whole file.

--- CONTRIBUTING.md ---
${CONTRIBUTING}`

async function callLlm(prompt: string): Promise<string> {
  const key = process.env.LLM_API_KEY
  if (!key) throw new Error('LLM_API_KEY must be set')
  const baseRaw = process.env.LLM_BASE_URL
  if (!baseRaw) throw new Error('LLM_BASE_URL must be set')
  const model = process.env.LLM_MODEL
  if (!model) throw new Error('LLM_MODEL must be set')
  const base = baseRaw.replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok)
    throw new Error(`LLM API ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM returned empty content')
  return content
}

function stripFences(s: string): string {
  const m = s.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/)
  return m ? m[1] : s
}

function runLint(
  file: string,
  upstreamRef: string
): { ok: boolean; output: string } {
  const r = spawnSync(
    'node',
    [
      'scripts/translation-lint.ts',
      '--line-count',
      upstreamRef,
      file,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }
  )
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  return { ok: r.status === 0, output: out }
}

function runPrettier(file: string): void {
  spawnSync('npx', ['prettier', '--write', file], {
    encoding: 'utf8',
    stdio: 'ignore',
  })
}

async function translateFile(
  file: string,
  upstreamRef: string
): Promise<boolean> {
  // The file in the executed branch is the English source (e.g. after an upstream merge).
  const source = existsSync(file)
    ? readFileSync(file, 'utf8')
    : git('show', `${upstreamRef}:${file}`)
  const sourceLines = source.split('\n').length

  const promptSource = `Source file (${file}) from the executed branch:\n\n${source}\n\n---\n`
  let prompt = `${promptSource}Translate the source file into Japanese. The output must have exactly ${sourceLines} lines.`

  const original = source
  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    let candidate: string
    try {
      candidate = stripFences(await callLlm(prompt))
    } catch (e) {
      console.error(`  LLM error: ${e}`)
      return false
    }
    let finalContent = candidate
    if (source.endsWith('\n') && !finalContent.endsWith('\n'))
      finalContent += '\n'
    if (!source.endsWith('\n') && finalContent.endsWith('\n'))
      finalContent = finalContent.replace(/\n$/, '')

    const candLines = finalContent.split('\n').length
    if (candLines !== sourceLines) {
      lastError = `Line count mismatch: got ${candLines}, expected ${sourceLines}.`
      prompt = `${promptSource}Previous attempt failed: ${lastError}\nFix the line count. Output must have exactly ${sourceLines} lines.\n\nPrevious output:\n${candidate}`
      continue
    }
    writeFileSync(file, finalContent)

    runPrettier(file)
    const lint = runLint(file, upstreamRef)
    if (lint.ok) {
      console.log(`  OK: ${file}`)
      return true
    }
    lastError = lint.output.trim().slice(0, 2000)
    prompt = `${promptSource}Previous attempt failed lint:\n${lastError}\nFix these issues. Output must have exactly ${sourceLines} lines.\n\nPrevious output:\n${readFileSync(file, 'utf8')}`
  }
  writeFileSync(file, original)
  console.error(`  FAILED: ${file}\n${lastError}`)
  return false
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.noFetch) {
    try {
      ensureUpstreamRemote()
      execFileSync(
        'git',
        ['fetch', 'upstream', 'main:refs/remotes/upstream/main'],
        { stdio: 'ignore' }
      )
    } catch (e) {
      console.warn(
        'fetch upstream failed; continuing with local refs:',
        e
      )
    }
  }

  const upstreamRef = args.upstream
  console.log(`upstream:   ${upstreamRef}`)

  let targets: string[] = []
  if (args.file) {
    targets = [args.file]
  } else if (args.base) {
    const changedRaw = git(
      'diff',
      '--name-only',
      `${args.base}..${args.upstream}`
    )
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
    targets = changedRaw.filter((f) => /\.md$/i.test(f))
    if (args.files) {
      targets = targets.filter((f) =>
        f.includes(args.files!.replace(/\*/g, ''))
      )
    }
    targets = targets.slice(0, args.maxFiles)
  } else {
    // Default targets: files changed in a merge commit (upstream merge).
    let isMerge = false
    try {
      git('rev-parse', '--verify', 'HEAD^2')
      isMerge = true
    } catch {
      isMerge = false
    }
    if (!isMerge) {
      console.log(
        'HEAD is not a merge commit. Provide --base/--upstream or --file.'
      )
      return
    }
    const changedRaw = git('diff', '--name-only', 'HEAD^1..HEAD')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
    targets = changedRaw.filter((f) => /\.md$/i.test(f))
    if (args.files) {
      targets = targets.filter((f) =>
        f.includes(args.files!.replace(/\*/g, ''))
      )
    }
    targets = targets.slice(0, args.maxFiles)
  }

  console.log(`Files needing translation: ${targets.length}`)
  for (const f of targets) console.log(`  - ${f}`)

  if (args.dryRun) return

  if (
    !process.env.LLM_API_KEY ||
    !process.env.LLM_BASE_URL ||
    !process.env.LLM_MODEL
  ) {
    console.error(
      'Set LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL to run translation.'
    )
    process.exit(1)
  }

  let ok = 0
  let fail = 0
  for (const f of targets) {
    console.log(`\nTranslating ${f}...`)
    const success = await translateFile(f, upstreamRef)
    if (success) ok++
    else fail++
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
