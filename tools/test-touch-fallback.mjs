import assert from 'node:assert/strict'
import fs from 'node:fs'

const detail = fs.readFileSync('page/detail.js', 'utf8')
const home = fs.readFileSync('page/home.js', 'utf8')
const results = fs.readFileSync('page/results.js', 'utf8')
const history = fs.readFileSync('page/history.js', 'utf8')
const favorites = fs.readFileSync('page/favorites.js', 'utf8')
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))

assert.match(detail, /_changeDefinitionScroll\(-1\)/, '详情页必须提供触控上一段')
assert.match(detail, /_changeDefinitionScroll\(1\)/, '详情页必须提供触控下一段')
assert.match(detail, /_changeDefinitionScroll\(step\)/, '表冠和触控必须共用详情滚动逻辑')
for (const [name, source] of Object.entries({ home, results, history, favorites })) {
  assert.match(source, /click_func:[\s\S]{0,180}(?:_changeCandidatePage|_changePage)/, `${name} 必须保留触控翻页`)
}
const platforms = app.targets.common.platforms
const trex = platforms.filter(p => p.name === 'trex3')
assert.equal(trex.length, 3, 'app.json 必须声明 3 个 T-Rex 3 平台')
assert.deepEqual(trex.map(p => p.deviceSource).sort((a, b) => a - b), [8716544, 8716545, 8716547], 'T-Rex 3 deviceSource 不完整')
assert.ok(trex.every(p => p.st === 'r' && p.sr === 'w480'), 'T-Rex 3 应为 480 圆屏')
console.log('PASS: 无表冠设备触控入口与 T-Rex 3 目标检查')
