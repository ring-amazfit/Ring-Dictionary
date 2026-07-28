// Profile the real I/O cost of each search by running the actual dict-engine
// against the real asset files (via stub @zos/fs). This tells us exactly how
// many synchronous readSync calls + bytes a search costs — that is what makes
// the watch UI stutter, since Zepp OS file reads block the UI thread.
import { performance } from 'node:perf_hooks'

const engine = (await import('../utils/dict-engine.js')).default

function run(label, q, resetCache = false) {
  if (resetCache) {
    // Simulate a cold search: drop result caches + window cache + inverted index.
    engine._enCache = {}
    engine._enCacheOrder = []
    engine._cnCache = {}
    engine._cnCacheOrder = []
    engine._lookupCache = {}
    engine._lookupCacheOrder = []
    engine._blockCache = {}
    engine._blockCacheOrder = []
    engine._cnInvReady = false
    engine._supp = null
    engine._suppWordMap = null
  }
  globalThis.__ioProfile = { calls: 0, bytes: 0, perCall: [] }
  const t0 = performance.now()
  const res = engine.search(q)
  const t1 = performance.now()
  const p = globalThis.__ioProfile
  const kb = (p.bytes / 1024).toFixed(1)
  const maxRead = p.perCall.length ? Math.max(...p.perCall) : 0
  console.log(
    `${label.padEnd(14)} q=${JSON.stringify(q).padEnd(10)} ` +
    `calls=${String(p.calls).padStart(3)} bytes=${kb.padStart(7)}KB ` +
    `maxRead=${(maxRead / 1024).toFixed(0)}KB ` +
    `time=${t1 - t0 < 1 ? '<1' : (t1 - t0).toFixed(1)}ms ` +
    `results=${res.length}`
  )
  return res
}

console.log('=== Cold start (each search drops caches first) ===')
run('en apple', 'apple', true)
run('en hello', 'hello', true)
run('en nien', 'nien', true)
run('en world', 'world', true)
run('cn 的', '的', true)
run('cn 是', '是', true)
run('cn 时间', '时间', true)
run('cn 学习', '学习', true)
run('cn 你好', '你好', true)

console.log('\n=== Warm (caches retained across queries, as in real use) ===')
run('en apple', 'apple', false)
run('en hello', 'hello', false)
run('en nien', 'nien', false)
run('en world', 'world', false)
run('cn 的', '的', false)
run('cn 是', '是', false)
run('cn 时间', '时间', false)
run('cn 学习', '学习', false)
run('cn 你好', '你好', false)
