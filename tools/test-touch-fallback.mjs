import assert from 'node:assert/strict'
import fs from 'node:fs'

const detail = fs.readFileSync('page/detail.js', 'utf8')
const home = fs.readFileSync('page/home.js', 'utf8')
const results = fs.readFileSync('page/results.js', 'utf8')
const history = fs.readFileSync('page/history.js', 'utf8')
const favorites = fs.readFileSync('page/favorites.js', 'utf8')
const about = fs.readFileSync('page/about.js', 'utf8')
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))

assert.match(detail, /_changeDefinitionScroll\(-1\)/, '详情页必须提供触控上一段')
assert.match(detail, /_changeDefinitionScroll\(1\)/, '详情页必须提供触控下一段')
assert.match(detail, /_changeDefinitionScroll\(step\)/, '表冠和触控必须共用详情滚动逻辑')
// v2.2.0 崩溃回归：history.js 使用 bindCrown 但此前漏导入 → 打开历史页即 ReferenceError 死机重启
assert.match(history, /import \{ bindCrown \} from '\.\.\/utils\/crown'/, '历史页必须导入 bindCrown')
// v2.2.0 关于页回归：返回按钮必须能调用已导入的 back()
assert.match(about, /import \{ back \} from '@zos\/router'/, '关于页必须导入 back')
assert.match(about, /ifdian_qr_ring\.png/, '关于页必须展示爱发电二维码')
// v2.2.0 表冠灵敏度：拼音候选翻页使用更宽松节流（350ms），避免一旋多翻
assert.match(home, /bindCrown\(function\(step\)[\s\S]{0,220}_changeCandidatePage\(step\)[\s\S]{0,40}, 350\)/, '拼音候选表冠翻页必须用 350ms 宽松节流')
for (const [name, source] of Object.entries({ home, results, history, favorites })) {
  assert.match(source, /click_func:[\s\S]{0,180}(?:_changeCandidatePage|_changePage)/, `${name} 必须保留触控翻页`)
}
const platforms = app.targets.common.platforms
const trex = platforms.filter(p => p.name === 'trex3')
assert.equal(trex.length, 3, 'app.json 必须声明 3 个 T-Rex 3 平台')
assert.deepEqual(trex.map(p => p.deviceSource).sort((a, b) => a - b), [8716544, 8716545, 8716547], 'T-Rex 3 deviceSource 不完整')
assert.ok(trex.every(p => p.st === 'r' && p.sr === 'w480'), 'T-Rex 3 应为 480 圆屏')
console.log('PASS: 无表冠设备触控入口与 T-Rex 3 目标检查')
