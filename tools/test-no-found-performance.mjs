// 未找到词性能回归：卡死重启的复现与防护
import assert from 'node:assert/strict'
import fs from 'node:fs'

const engine = (await import('../utils/dict-engine.js')).default
engine.warmup()

function timed(fn) {
  const t0 = Date.now()
  const r = fn()
  return { r, ms: Date.now() - t0 }
}

// 1) 中文未找到词：详情页 lookupDefinition 必须短路快速返回 null（曾是 260000 字符扫描卡死）
let t = timed(() => engine.lookupDefinition('你好呀'))
assert.equal(t.r, null, '中文词 lookupDefinition 应返回 null')
assert.ok(t.ms < 50, `中文未找到词必须快速失败（实际 ${t.ms}ms）`)

// 2) history._open 路径：中文词 lookup 同样短路
t = timed(() => engine.lookup('你好呀'))
assert.equal(t.r, null, '中文词 lookup 应返回 null')
assert.ok(t.ms < 50, `中文词 lookup 必须快速失败（实际 ${t.ms}ms）`)

// 3) 纯字母未找到词：isPast 快速 break
t = timed(() => engine.lookupDefinition('qqqqqq'))
assert.equal(t.r, null, '不存在纯字母词应返回 null')
assert.ok(t.ms < 50, `纯字母未找到词必须快速失败（实际 ${t.ms}ms）`)

// 4) 含空格未找到词：忽略标点 isPast 快速 break（曾无界扫描）
t = timed(() => engine.lookupDefinition('abc def xyz'))
assert.equal(t.r, null, '不存在含空格词应返回 null')
assert.ok(t.ms < 100, `含空格未找到词必须快速失败（实际 ${t.ms}ms）`)

// 5) antares：完整词必须找到且快（v2.1.0 12000 上限扫不到、v2.2.0 260000 扫描巨慢）
t = timed(() => engine.lookupDefinition('antares'))
assert.ok(t.r && t.r.definition, 'antares 必须能查到')
assert.ok(t.ms < 100, `antares 必须快速命中（实际 ${t.ms}ms）`)

// 6) 远距离谚语词仍能命中（isPast 正确 break 于目标之后，不依赖大上限）
for (const w of ['a word spoken is past recalling', 'a la carte', 'act of god']) {
  t = timed(() => engine.lookupDefinition(w))
  assert.ok(t.r && t.r.definition, `${w} 必须能查到`)
  assert.ok(t.ms < 200, `${w} 必须可接受耗时（实际 ${t.ms}ms）`)
}

// 7) 模糊匹配不回归（nien → nice looking 类）
const fuzzy = engine.search('nien')
assert.ok(fuzzy.length > 0, '模糊搜索 nien 不应回归为空')

// 8) 全量命中保持：主词库可输入词条全部 lookupDefinition 命中
const raw = fs.readFileSync(new URL('../assets/common/dic/txtTrans_1.0.txt', import.meta.url))
const text = raw.toString('utf16le').replace(/^\uFEFF/, '')
const lines = text.split(/\r?\n/)
let miss = 0
for (let i = 0; i + 1 < lines.length; i += 2) {
  const word = lines[i].replace(/[\u0000\uFEFF]/g, '').trim().toLowerCase()
  if (!word || word.indexOf('\\') >= 0 || !/[a-z]/.test(word.charAt(0))) continue
  const found = engine.lookupDefinition(word)
  if (!found || !found.definition) {
    miss++
    if (miss <= 5) console.error('漏词:', word)
  }
}
assert.equal(miss, 0, '主词库全部可输入词条必须命中')

console.log('PASS: 未找到词快速失败、antares/远距离词命中与全量词条回归')
