// Extended I/O profiler — Node 26 compatible (uses module.register instead of --loader).
// Counts readSync calls + bytes per search via the @zos/fs stub. Call count is the
// proxy for on-device slowness (Node local SSD hides latency; only counts/bytes matter).
import { register } from 'node:module'
register(new URL('./loader.mjs', import.meta.url).href, import.meta.url)
import { performance } from 'node:perf_hooks'

const engine = (await import('../utils/dict-engine.js')).default

function reset() {
  engine._enCache = {}; engine._enCacheOrder = []
  engine._cnCache = {}; engine._cnCacheOrder = []
  engine._lookupCache = {}; engine._lookupCacheOrder = []
  engine._blockCache = {}; engine._blockCacheOrder = []
  engine._cnInvReady = false
  engine._supp = null; engine._suppWordMap = null
}

function run(label, q, cold) {
  if (cold) reset()
  globalThis.__ioProfile = { calls: 0, bytes: 0 }
  const t0 = performance.now()
  const res = engine.search(q)
  const t1 = performance.now()
  const p = globalThis.__ioProfile
  console.log(
    label.padEnd(6),
    'q=' + JSON.stringify(q).padEnd(8),
    'calls=' + String(p.calls).padStart(4),
    'KB=' + (p.bytes / 1024).toFixed(0).padStart(5),
    't=' + (t1 - t0 < 1 ? '<1' : t1 - t0.toFixed(1)) + 'ms',
    'res=' + res.length
  )
}

function runP(label, q) {
  reset()
  globalThis.__ioProfile = { calls: 0, bytes: 0 }
  const t0 = performance.now()
  const res = engine.prefixSuggest(q, 5)
  const t1 = performance.now()
  const p = globalThis.__ioProfile
  console.log(
    label.padEnd(6),
    'q=' + JSON.stringify(q).padEnd(8),
    'calls=' + String(p.calls).padStart(4),
    'KB=' + (p.bytes / 1024).toFixed(0).padStart(5),
    't=' + (t1 - t0 < 1 ? '<1' : t1 - t0.toFixed(1)) + 'ms',
    'sug=' + res.length
  )
}

const cn = ['中国', '美国', '我们', '可以', '时间', '学习', '你好', '朋友', '工作', '因为',
  '所以', '现在', '什么', '怎么', '知道', '时候', '东西', '自己', '问题', '国家',
  '世界', '生活', '谢谢', '喜欢', '电脑', '手机', '英语', '中文', '学生', '老师',
  '医院', '飞机', '汽车', '学校', '公司', '经济', '文化', '历史', '科学', '技术',
  '音乐', '电影', '鱼', '狗', '猫', '的', '是', '一', '不', '了']
const en = ['apple', 'book', 'computer', 'hello', 'world', 'time', 'water', 'people', 'china', 'love', 'work']
const enMiss = ['nien', 'helo', 'wrold']

console.log('=== COLD (每次重置缓存) ===')
for (const q of cn) run('cn', q, true)
for (const q of en) run('en', q, true)
for (const q of enMiss) run('en?', q, true)
console.log('=== WARM (缓存保留) ===')
for (const q of cn) run('cn', q, false)
for (const q of en) run('en', q, false)
console.log('=== prefixSuggest (输入联想, 每次冷) ===')
for (const q of ['co', 'st', 'chi', '学', '时间']) runP('ps', q)
