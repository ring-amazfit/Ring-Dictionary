// Correct analysis: parse every entry (word\n / def\n pairs) and aggregate by
// first letter. UTF-16LE, no BOM (verified). Run: node tools/analyze-dict.mjs
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DICT = join(__dirname, '..', 'assets', 'common', 'dic', 'txtTrans_1.0.txt')
const buf = readFileSync(DICT)
const n = buf.length

// Walk byte offsets; a line ends at a 0x0A 0x00 pair (UTF-16LE newline).
// Alternate word / def lines. Record each completed entry's byte span.
const entries = []
let i = 0
let entryStart = 0
let inDef = false
let pendingWord = ''

function decodeWord(off, end) {
  // end is the byte offset of the newline (exclusive). word bytes = [off, end)
  const lenChars = (end - off) / 2
  return buf.toString('utf16le', off, off + lenChars * 2)
}

while (i + 1 < n) {
  if (buf[i] === 0x0A && buf[i + 1] === 0x00) {
    if (!inDef) {
      pendingWord = decodeWord(entryStart, i)
      inDef = true
    } else {
      const defEnd = i // byte offset of the def's newline
      entries.push({ word: pendingWord, start: entryStart, end: defEnd })
      inDef = false
      entryStart = i + 2
    }
    i += 2
  } else {
    i += 2
  }
}

const byLetter = {}
let total = 0
let totalBytes = 0
for (const e of entries) {
  const w = e.word || ''
  if (!w) continue
  const letter = w[0].toLowerCase()
  const bytes = e.end - e.start
  if (!byLetter[letter]) byLetter[letter] = { first: e.start, last: e.end, count: 0, firstWord: w }
  const L = byLetter[letter]
  if (e.start < L.first) { L.first = e.start; L.firstWord = w }
  if (e.end > L.last) L.last = e.end
  L.count++
  total++
  totalBytes += bytes
}

const letters = Object.keys(byLetter).sort()
console.log('totalEntries:', total, ' fileBytes:', n)
console.log('letter  count    bytes   firstWord        startByte')
for (const L of letters) {
  const o = byLetter[L]
  console.log(
    L.padEnd(6),
    String(o.count).padStart(7),
    String(o.last - o.first).padStart(9),
    '  ' + o.firstWord.padEnd(16),
    o.first
  )
}
console.log('sumBytes:', totalBytes)

// Frequency-ordered letters (for warmup priority)
const freq = letters.slice().sort((a, b) => byLetter[b].count - byLetter[a].count)
console.log('\nfreqOrder:', freq.join(''))
