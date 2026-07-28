import assert from 'node:assert/strict'

const { default: engine } = await import('../utils/dict-engine.js')

function reset() {
  engine._enCache = {}
  engine._enCacheOrder = []
  engine._lookupCache = {}
  engine._lookupCacheOrder = []
  engine._blockCache = {}
  engine._blockCacheOrder = []
  engine._supp = null
  engine._suppWordMap = null
}

reset()
const result = engine.search('play')
const words = result.map(item => item.word)
assert.ok(words.includes('play'), '必须保留精确词 play')
assert.ok(words.includes('player'), '必须找到同词根后缀 player')
assert.ok(words.includes('playful'), '必须找到同词根后缀 playful')
assert.ok(result.length > 4, '相似词根结果必须支持查看更多')

console.log('PASS: 英文同词根后缀搜索', words)
