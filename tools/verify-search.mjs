import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url).pathname.replace(/^\/+([A-Za-z]):/, '$1:/')
const dictPath = new URL('../assets/common/dic/txtTrans_1.0.txt', import.meta.url)
const suppPath = new URL('../assets/common/dic/supplement.txt', import.meta.url)
const raw = fs.readFileSync(dictPath)
const text = raw.toString('utf16le').replace(/^\uFEFF/, '')
const entries = []
const lines = text.split(/\r?\n/)
for (let i = 0; i + 1 < lines.length; i += 2) {
  const word = lines[i].replace(/[\u0000\uFEFF]/g, '').trim().toLowerCase()
  const definition = lines[i + 1].replace(/[\u0000]/g, '').trim()
  if (word) entries.push({ word, definition })
}
const supplement = fs.readFileSync(suppPath, 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const tab = line.indexOf('\t')
  return { word: line.slice(0, tab).toLowerCase(), definition: line.slice(tab + 1).trim() }
})
const all = [...entries, ...supplement]
const words = new Set(all.map(e => e.word))

function exact(q) {
  return all.find(e => e.word === q) || null
}
function prefix(q, limit = 8) {
  return all.filter(e => e.word.startsWith(q)).slice(0, limit)
}
function fuzzy(q, limit = 8) {
  return all.filter(e => {
    let p = 0
    for (const ch of e.word) if (ch === q[p]) p++
    return p === q.length
  }).slice(0, limit)
}
function chinese(q, limit = 30) {
  return all.filter(e => e.definition.includes(q)).slice(0, limit)
}

assert.equal(exact('apple')?.word, 'apple', '精确英文 apple')
assert.ok(prefix('app').some(e => e.word === 'apparence' || e.word === 'apparent' || e.word === 'apparatus'), '前缀英文 app')
assert.ok(fuzzy('nien').some(e => e.word.includes('indeed') || e.word.includes('beginning')), '模糊英文 nien')
assert.ok(fuzzy('helo').some(e => e.word === 'helot' || e.word.includes('anthelion')), '模糊英文 helo')
assert.ok(fuzzy('wrold').some(e => e.word.includes('world') || e.word.includes('shoulders')), '模糊英文 wrold')
assert.ok(chinese('时间').length > 0, '中文释义 时间')
assert.ok(chinese('学习').length > 0, '中文释义 学习')
assert.equal(exact(''), null, '空查询不应命中')
assert.equal(words.has('__ring_missing_word__'), false, '不存在单词不应伪造词条')

console.log('PASS: 真实词库发布回归')
console.log(`词条: ${all.length}（主词库 ${entries.length} + supplement ${supplement.length}）`)
console.log('覆盖: 精确、前缀、模糊、中文释义、空查询、不存在词')
