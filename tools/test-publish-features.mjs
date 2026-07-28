import assert from 'node:assert/strict'
import fs from 'node:fs'

const files = ['page/home.js', 'page/results.js', 'page/detail.js', 'page/favorites.js', 'page/history.js']
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  assert.match(source, /bindCrown/, `${file} 必须使用统一表冠 helper`)
  assert.doesNotMatch(source, /crownAccum|deviceSource|getDeviceInfo/, `${file} 不得保留旧表冠 hack`)
}
const history = fs.readFileSync('page/history.js', 'utf8')
const results = fs.readFileSync('page/results.js', 'utf8')
const detail = fs.readFileSync('page/detail.js', 'utf8')
assert.match(history, /removeHistory\(word\)/)
assert.match(history, /getText\('clearHistory'\)/)
assert.match(results, /getText\('more'\)/)
assert.match(results, /dictEngine\.lookup\(item\.word\.toLowerCase\(\)\)/)
assert.match(detail, /_scrollLabel/)
console.log('PASS: 表冠规范、历史操作、查看更多与详情提示检查')
