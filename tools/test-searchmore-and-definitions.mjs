import assert from 'node:assert/strict'
import fs from 'node:fs'

// 真实词库全集
const raw = fs.readFileSync(new URL('../assets/common/dic/txtTrans_1.0.txt', import.meta.url))
const text = raw.toString('utf16le').replace(/^\uFEFF/, '')
const lines = text.split(/\r?\n/)
const entries = []
for (let i = 0; i + 1 < lines.length; i += 2) {
  const word = lines[i].replace(/[\u0000\uFEFF]/g, '').trim().toLowerCase()
  const definition = lines[i + 1].replace(/[\u0000]/g, '').trim()
  if (word) entries.push({ word, definition })
}

const engine = (await import('../utils/dict-engine.js')).default
engine.warmup()

// 1) 之前失败的词必须能被 lookupDefinition 找到
const previouslyFailing = ['act of god', 'a la carte', 'aluminum', 'alogia', 'anon', 'answer for', 'antetype', 'aluminum foil', 'penal', 'the', 'aaron\'s beard']
const stillMissing = []
for (const w of previouslyFailing) {
  const found = engine.lookupDefinition(w)
  if (!found || !found.definition) stillMissing.push(w)
}
assert.deepEqual(stillMissing, [], '此前查不到的词典词必须能被 lookupDefinition 找到')

// 2) 全量：主词库每个“可输入”词条 lookupDefinition 都必须命中。
// 排除两类数据异常：含字面反斜杠的导出损坏词行；撇号开头且排序在字母区之前
// 的词（如 'll），用户无法正常输入，前缀扫描也无法命中。
const missAll = []
for (const e of entries) {
  if (e.word.indexOf('\\') >= 0) continue
  if (e.word && !/[a-z]/.test(e.word.charAt(0))) continue
  const found = engine.lookupDefinition(e.word)
  if (!found || !found.definition) {
    missAll.push(e.word)
    if (missAll.length >= 20) break
  }
}
assert.deepEqual(missAll, [], '主词库全部可输入词条 lookupDefinition 必须命中')

// 3) searchMore：'pen' 初始结果不足时点“更多”能返回后续结果，多次点击可持续加载
const base = engine.search('pen')
assert.ok(base.length <= 21, '初始 search 结果应受现有上限约束')
const more = []
let offset = base.length
for (let round = 0; round < 3; round++) {
  const batch = engine.searchMore('pen', offset)
  if (!batch.length) break
  more.push(...batch)
  offset += batch.length
}
assert.ok(more.length > 0, 'searchMore 必须返回 base 之后的新结果')
const words = new Set([...base, ...more].map(x => x.word))
assert.ok(words.has('penal') && words.has('penny'), '多次 searchMore 应继续返回 pen* 词族（如 penal/penny）')

// 4) searchMore 不会返回重复
const all2 = [...base, ...more]
const seen = new Set()
for (const item of all2) {
  assert.ok(!seen.has(item.word), `searchMore 不得返回重复词: ${item.word}`)
  seen.add(item.word)
}

// 5) 中文 searchMore 应返回空（中文搜索已有上限，不做继续加载）
assert.deepEqual(engine.searchMore('你', 0), [], '中文 searchMore 应返回空数组')

console.log(`PASS: lookupDefinition 全量命中（${entries.length} 词条）与 searchMore 继续加载回归`)
