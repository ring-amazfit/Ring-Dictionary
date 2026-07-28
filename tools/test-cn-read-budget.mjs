import assert from 'node:assert/strict'

const { default: engine } = await import('../utils/dict-engine.js')
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

globalThis.__ioProfile = { calls: 0, bytes: 0, perCall: [] }
const result = engine.search('学习')

assert.equal(result.length, 4, '学习必须保留 4 个结果')
assert.ok(result.every(item => item.definition.includes('学习')), '每条结果必须命中完整释义')
assert.ok(globalThis.__ioProfile.calls <= 4, `学习冷搜读取次数应不超过 4，实际 ${globalThis.__ioProfile.calls}`)

console.log('PASS: 学习冷搜读取预算', globalThis.__ioProfile.calls)
