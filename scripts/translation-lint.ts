// CONTRIBUTING.md の翻訳ルールを検証する lint スクリプト
//
// 使い方:
//   node ./scripts/translation-lint.ts [file ...]
//     ファイルが指定されない場合は docs/ 以下の .md をすべて検査します。
//   node ./scripts/translation-lint.ts --line-count <remote> <branch> [file ...]
//     アップストリーム (指定したリモートのブランチ) と行数が一致しないファイルを検出します。
//     例: node ./scripts/translation-lint.ts --line-count upstream main
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

type Issue = {
  file: string
  line: number
  rule: string
  message: string
  text: string
}

const issues: Issue[] = []

const KANA = '[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff]'
const hasJapanese = (s: string) => new RegExp(KANA).test(s)

function check(file: string) {
  if (!file.endsWith('.md')) return
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const raw = lines[i]
    // コードブロック (``` で囲まれた領域) 内は対象外
    let line = raw
    if (!hasJapanese(line)) continue

    // インラインコードを仮置きして、コード内の文字列が誤検知しないようにする
    const codes: string[] = []
    line = line.replace(/`[^`]*`/g, (m) => {
      codes.push(m)
      return `\u0000${codes.length - 1}\u0000`
    })
    // Markdown リンクの URL 部分も除外
    const urls: string[] = []
    line = line.replace(/\]\([^)]*\)/g, (m) => {
      urls.push(m)
      return `\u0001${urls.length - 1}\u0001`
    })

    const push = (rule: string, message: string) => {
      issues.push({
        file,
        line: lineNo,
        rule,
        message,
        text: raw.trim().slice(0, 80),
      })
    }

    // 全角記号・全角数字・半角カタカナの使用は禁止 (〜 のみ許容)
    for (const ch of line.match(/[\uff01-\uff5e\uff66-\uff9d]/g) ??
      []) {
      if (/\uff66-\uff9d/.test(ch) || ch === '\uff9d') {
        push('half-width-katakana', '半角カタカナは使用禁止です')
        break
      }
      if (ch !== '\uff5e') {
        push(
          'full-width-char',
          `全角記号・全角数字は使用禁止です: "${ch}"`
        )
        break
      }
    }
    if (/[０-９]/.test(line)) {
      push('full-width-digit', '全角数字は使用禁止です')
    }

    // 文章中の英単語の前後にはスペースを追加 (かな/漢字と英字が直接隣接してはならない)
    // 数字は日本語文中でそのまま使うことが多いため対象外
    const m1 = line.match(
      new RegExp(`${KANA}[A-Za-z]|[A-Za-z]${KANA}`)
    )
    if (m1) {
      push(
        'space-around-latin',
        `英単語の前後にはスペースが必要です (${m1[0]})`
      )
    }

    // 括弧 () の前後には半角スペース。ただし markdown リンク記法 [..](..) や関数呼び出し風のコード的表記は除く
    const paren = line.match(
      new RegExp(`(?:^|[^\\s(])\\(|\\)[^\\s.,;:)\\]}]`)
    )
    if (paren && !/[`\]]\(/.test(line)) {
      // 簡易判定: 日本語文の中で ( の直前が空白でない場合のみ検出
      const open = line.match(new RegExp(`${KANA}\\(`))
      const close = line.match(new RegExp(`\\)${KANA}`))
      if (open || close) {
        push(
          'space-around-paren',
          '括弧 () の前後には半角スペースが必要です'
        )
      }
    }

    // 句点の後にはスペース (行末・閉じ括弧類・プレースホルダ直前は不要)
    const noSpaceAfterPeriod = line.match(
      /。[^ \t\u0000\u0001」）)】\]]/
    )
    if (noSpaceAfterPeriod) {
      push(
        'space-after-period',
        '句点の後にはスペースを追加してください'
      )
    }

    // インラインコードブロックの前後には半角スペース
    for (let ci = 0; ci < codes.length; ci++) {
      const ph = `\u0000${ci}\u0000`
      const before = line[line.indexOf(ph) - 1]
      const afterIdx = line.indexOf(ph) + ph.length
      const after = line[afterIdx]
      const codeText = codes[ci]
      if (
        (before !== undefined &&
          /\S/.test(before) &&
          before !== '(') ||
        (after !== undefined && /\S/.test(after))
      ) {
        // 先頭/行頭、あるいはリンクテキスト内などは除外しにくいので、かな漢字との直接隣接のみ検出
        if (
          new RegExp(`^(.*[^\\s(])?${ph}`).test(line) &&
          before !== undefined &&
          new RegExp(KANA).test(before)
        ) {
          push(
            'space-around-code',
            'インラインコードブロックの前には半角スペースを追加してください'
          )
        }
        if (after !== undefined && new RegExp(KANA).test(after)) {
          push(
            'space-around-code',
            'インラインコードブロックの後には半角スペースを追加してください'
          )
        }
      }
    }
  }
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

// アップストリームと行数を比較する (--line-count <remote> <branch>)
function checkLineCount(file: string, ref: string) {
  if (!file.endsWith('.md')) return
  let upstream: string
  try {
    upstream = execFileSync('git', ['show', `${ref}:${file}`], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch {
    // アップストリームに存在しないファイルは比較対象外
    return
  }
  const localLines = readFileSync(file, 'utf8').split('\n').length
  const upstreamLines = upstream.split('\n').length
  if (localLines !== upstreamLines) {
    issues.push({
      file,
      line: 0,
      rule: 'line-count',
      message: `翻訳元と行数が一致しません (ローカル: ${localLines} 行 / 翻訳元: ${upstreamLines} 行)。翻訳は翻訳元と同じ行に収めてください`,
      text: '',
    })
  }
}

const argv = process.argv.slice(2)
let lineCountRef: string | null = null
let targets = argv.slice()
if (targets[0] === '--line-count') {
  const remote = targets[1]
  const branch = targets[2]
  if (!remote || !branch) {
    console.error(
      '--line-count には <remote> と <branch> を指定してください'
    )
    process.exit(2)
  }
  lineCountRef = `${remote}/${branch}`
  targets = targets.slice(3)
}
// 引数がディレクトリなら再帰的に .md ファイルへ展開する
function expandTargets(paths: string[]): string[] {
  const out: string[] = []
  for (const p of paths) {
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

for (const f of expandTargets(targets.length ? targets : ['docs'])) {
  if (lineCountRef) checkLineCount(f, lineCountRef)
  check(f)
}

if (issues.length > 0) {
  for (const it of issues) {
    console.error(`${it.file}:${it.line}: ${it.rule}: ${it.message}`)
    console.error(`  > ${it.text}`)
  }
  console.error(`\n${issues.length} 件の問題が見つかりました。`)
  process.exit(1)
} else {
  console.log('translation-lint: 問題は見つかりませんでした。')
}
