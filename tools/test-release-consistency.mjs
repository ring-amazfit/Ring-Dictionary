import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))

assert.equal(app.app.appId, 1121555, 'app.json APPID 必须为 1121555')
assert.equal(pkg.zeppos.appId, 1121555, 'package.json APPID 必须为 1121555')
assert.equal(app.app.version.name, '2.2.0', 'app.json 版本名不一致')
assert.equal(pkg.version, '2.2.0', 'package.json 版本不一致')
assert.equal(lock.version, '2.2.0', 'package-lock 根版本不一致')
assert.equal(lock.packages[''].version, '2.2.0', 'package-lock 根 package 版本不一致')
assert.deepEqual(app.permissions, [
  'device:os.local_storage',
  'data:os.device.info',
  'device:os.file'
], '权限声明包含未使用权限或顺序漂移')

assert.ok(fs.existsSync('PRIVACY.md'), '必须存在本地隐私声明，供 Zepp Console 填写')
assert.match(fs.readFileSync('PRIVACY.md', 'utf8'), /搜索词|历史记录|收藏/, '隐私声明必须覆盖本地数据')
const icon = fs.readFileSync('assets/common/icon.png')
assert.equal(icon.readUInt32BE(16), 240, '市场图标宽度必须为 240')
assert.equal(icon.readUInt32BE(20), 240, '市场图标高度必须为 240')
assert.equal(icon[25], 6, '市场图标必须为 RGBA PNG')

const platforms = app.targets.common.platforms
assert.equal(platforms.length, 19, '发布目标应为 Balance、Cheetah Pro、Active 2 Round、GTR4 和 T-Rex 3 的 19 个圆屏目标')
assert.equal(platforms.filter(p => p.name === 'balance').length, 3, 'Balance 目标必须为 3 个')
assert.equal(platforms.filter(p => p.name === 'cheetahpro').length, 2, 'Cheetah Pro 目标必须为 2 个')
assert.equal(platforms.filter(p => p.name === 'active2').length, 8, 'Active 2 Round 目标必须为 8 个')
assert.equal(platforms.filter(p => p.name === 'gtr4').length, 3, 'GTR4 目标必须为 3 个')
assert.equal(platforms.filter(p => p.name === 'trex3').length, 3, 'T-Rex 3 目标必须为 3 个')
assert.deepEqual(
  platforms.filter(p => p.name === 'cheetahpro').map(p => p.deviceSource).sort((a, b) => a - b),
  [8126720, 8126721],
  'Cheetah Pro deviceSource 不完整或错误'
)
assert.deepEqual(
  platforms.filter(p => p.name === 'active2').map(p => p.deviceSource).sort((a, b) => a - b),
  [8913152, 8913153, 8913155, 8913159, 10092800, 10092801, 10092803, 10092807],
  'Active 2 Round deviceSource 不完整或错误'
)
assert.ok(platforms.every(p => p.st === 'r'), '所有发布目标必须为圆屏')
assert.ok(platforms.every(p => /^w(466|480)$/.test(p.sr)), '目标分辨率必须与圆屏布局一致')
assert.ok(!platforms.some(p => p.name === 'gts4'), '方屏 GTS4 不应在未适配时发布')

assert.ok(fs.existsSync('README.en.md'), '必须提供英文 README')
const englishReadme = fs.readFileSync('README.en.md', 'utf8')
assert.match(englishReadme, /^# Ring Dictionary/m, '英文 README 必须使用英文项目标题')
assert.match(englishReadme, /Amazfit Cheetah Pro/, '英文 README 必须列出 Cheetah Pro 支持')
assert.match(englishReadme, /Amazfit Active 2 \(Round\)/, '英文 README 必须列出 Active 2 Round 支持')

const results = fs.readFileSync('page/results.js', 'utf8')
const home = fs.readFileSync('page/home.js', 'utf8')
const detail = fs.readFileSync('page/detail.js', 'utf8')
const settings = fs.readFileSync('page/settings.js', 'utf8')
const setting = fs.readFileSync('setting/index.js', 'utf8')

assert.match(home, /getGaokaoCountdownText\([^)]*getText\)/, '首页高考提示必须使用本地化翻译器')
assert.match(home, /showToast\(\{\s*content:\s*getGaokaoCountdownText\([^)]*getText\)/, '首页必须使用官方 showToast')
assert.match(home, /gaokaoLastNoticeDate/, '首页必须保存每日提示标记')
assert.match(detail, /getGaokaoCountdownText\([^)]*getText\)/, '详情页高考提示必须使用本地化翻译器')
assert.match(detail, /resultToken: self\.state\.resultToken/, '相关词跳转必须保留结果 token')
assert.match(detail, /back\(\)/, '详情返回必须调用官方 back() 返回结果页')
assert.match(detail, /url: 'page\/home'/, '查词典必须回到主页')
assert.match(settings, /getText\('settingsTitle'\)/, '设置标题必须本地化')
assert.match(settings, /_toggleGaokao/, '手表设置必须有高考倒计时开关')
assert.doesNotMatch(setting, /settingsStorage|setItem\(/, '手机设置页不得伪造一个不会同步的手表开关')
assert.match(results, /this\.state\.expandPending\.shift\(\)/, '展开必须逐项消费待处理队列')
assert.match(results, /getText\('openDetail'\)/, '结果页打开详情按钮必须本地化')
assert.match(results, /getText\('expandDefinition'\)/, '结果页展开按钮必须本地化')
assert.match(results, /getText\('more'\)/, '结果页更多按钮必须本地化')
assert.match(results, /setTimeout\(function\(\)\s*\{[\s\S]*?_expandNext\(generation\)/, '释义展开必须让出事件循环')
assert.match(results, /clearTimeout\(this\.state\.expandTimer\)/, '结果页销毁时必须清理展开定时器')
assert.doesNotMatch(results, /this\.expand(?:Generation|Pending|Done|Timer)(?!\w)/, '展开状态必须统一存放在 this.state，不能使用未初始化的页面实例字段')

const cardTop = 94
const cardHeight = 52
const cardStep = 58
const cardCount = 4
const expandTop = 330
const expandBottom = expandTop + 28
const lastCardBottom = cardTop + (cardCount - 1) * cardStep + cardHeight
assert.ok(expandTop >= lastCardBottom, '展开按钮不得覆盖第 4 张结果卡片')
assert.ok(expandBottom < 384, '展开按钮不得覆盖底部导航')

console.log('PASS: 发布一致性、圆屏目标、设置同步、路由和展开边界检查')
