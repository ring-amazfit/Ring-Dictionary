// Build a compact binary Chinese inverted index for ring-dictionary-v2.
//
// Output: assets/common/dic/cn-inv.bin
//   Maps each CJK char -> list of byte offsets (into the UTF-16LE main dict)
//   of the WORD line whose definition contains that char. This lets Chinese
//   search seek directly to candidate entries instead of scanning/decoding the
//   whole 1.34 MB cn-index.txt. It also lets us DELETE cn-index.txt (size win).
//
// Binary layout (all little-endian):
//   Header (12 bytes): magic 'CIDX' | u32 charCount N | u32 postingsStart
//   Char table (N * 8 bytes, sorted by codepoint ascending):
//     u16 codepoint | u16 count | u32 postingByteOffset (absolute, into this file)
//   Postings: per char, `count` * 3 bytes (u24 LE) = word byte-offset into main dict
//
// Run:  node tools/build-cn-inv.mjs   (from project root)
import { openSync, readSync, statSync, writeFileSync } from 'fs'

const DICT = 'assets/common/dic/txtTrans_1.0.txt'
const OUT = 'assets/common/dic/cn-inv.bin'

const size = statSync(DICT).size
const fd = openSync(DICT, 'r')
const raw = Buffer.alloc(size)
readSync(fd, raw, 0, size, 0)
const text = raw.toString('utf16le')
const lines = text.split('\n')

// char (codepoint) -> array of word byte offsets (ascending, since we scan in order)
const map = new Map()
let charPos = 0
for (let i = 0; i + 1 < lines.length; i += 2) {
  const word = lines[i]
  const def = lines[i + 1]
  const wordOff = charPos * 2
  charPos += word.length + 1 + def.length + 1
  const seen = new Set()
  for (const ch of def) {
    const c = ch.codePointAt(0)
    if (c >= 0x4e00 && c <= 0x9fff && !seen.has(c)) {
      seen.add(c)
      let arr = map.get(c)
      if (!arr) { arr = []; map.set(c, arr) }
      arr.push(wordOff)
    }
  }
}

const codes = Array.from(map.keys()).sort((a, b) => a - b)
const N = codes.length
const postingsStart = 12 + N * 8

// total postings
let totalPostings = 0
for (const c of codes) totalPostings += map.get(c).length

const out = Buffer.alloc(postingsStart + totalPostings * 3)
// header
out.write('CIDX', 0, 'ascii')
out.writeUInt32LE(N, 4)
out.writeUInt32LE(postingsStart, 8)

// char table + postings
let tblPos = 12
let postPos = postingsStart
for (const c of codes) {
  const arr = map.get(c)
  out.writeUInt16LE(c, tblPos)
  out.writeUInt16LE(arr.length, tblPos + 2)
  out.writeUInt32LE(postPos, tblPos + 4)
  tblPos += 8
  for (let k = 0; k < arr.length; k++) {
    const off = arr[k]
    out[postPos] = off & 0xff
    out[postPos + 1] = (off >> 8) & 0xff
    out[postPos + 2] = (off >> 16) & 0xff
    postPos += 3
  }
}

writeFileSync(OUT, out)
console.log('wrote', OUT)
console.log('chars:', N, 'postings:', totalPostings, 'size:', (out.length / 1024).toFixed(0) + 'KB')
