// 搜索性能基准：记录英文/中文查询的耗时与 readSync 次数，用于对比后续优化。
// 运行：node --loader ./tools/loader.mjs tools/bench-search.mjs
import fs from 'node:fs'

const engine = (await import('../utils/dict-engine.js')).default
engine.warmup()

const enQueries = ['the', 'play', 'pen', 'book', 'water', 'love', 'time', 'apple', 'learn', 'word',
  'a', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it', 'for',
  'computer', 'dictionary', 'university', 'beautiful', 'government', 'knowledge', 'aluminum',
  'act of god', 'a la carte', "aaron's beard", 'zzzzzzzz', 'qqqqqq']
const cnQueries = ['时间', '学习', '你好', '快乐', '工作', '家庭', '朋友', '美丽', '知识', '的']

function bench(name, queries) {
  let totalMs = 0
  let totalReads = 0
  let maxMs = 0
  const details = []
  for (const q of queries) {
    const t0 = Date.now()
    const r = engine.search(q)
    const ms = Date.now() - t0
    totalMs += ms
    totalReads += engine.lastReads || 0
    if (ms > maxMs) maxMs = ms
    details.push({ q, ms, reads: engine.lastReads || 0, n: r.length })
  }
  const avg = totalMs / queries.length
  console.log(`\n[${name}] 查询数=${queries.length} 平均=${avg.toFixed(1)}ms 总读取=${totalReads} 最慢=${maxMs}ms`)
  details.sort((a, b) => b.ms - a.ms)
  console.log('最慢 5 条:')
  for (const d of details.slice(0, 5)) {
    console.log(`  ${d.q} → ${d.ms}ms, ${d.reads}次读取, ${d.n}条结果`)
  }
  return { avg, totalReads, maxMs }
}

const e = bench('英文', enQueries)
const c = bench('中文', cnQueries)
console.log('\n=== 汇总 ===')
console.log(`英文: 平均 ${e.avg.toFixed(1)}ms / 总读取 ${e.totalReads}`)
console.log(`中文: 平均 ${c.avg.toFixed(1)}ms / 总读取 ${c.totalReads}`)
