import assert from 'node:assert/strict'
import fs from 'node:fs'
import { saveResultRoute, consumeResultRoute } from '../utils/route-cache.js'

const payload = {
  query: '你',
  results: [{ word: 'your', definition: 'pron.你的', exact: true }],
  reads: 2
}
const token = saveResultRoute(payload)
// 模拟 Zepp OS 从结果页跳到详情页后切换了 page 全局上下文。
globalThis.__ringDictResultRoute = null
assert.deepEqual(consumeResultRoute(token), payload, '返回结果页时路由 payload 必须仍可恢复')

const routeCache = fs.readFileSync('utils/route-cache.js', 'utf8')
assert.match(routeCache, /sessionStorage\.setItem/, '路由缓存必须写入官方 sessionStorage')
assert.match(routeCache, /sessionStorage\.getItem/, '路由缓存必须从官方 sessionStorage 恢复')
assert.doesNotMatch(routeCache, /sessionStorage\.removeItem/, '详情返回前不能删除结果路由缓存')

const results = fs.readFileSync('page/results.js', 'utf8')
assert.match(results, /!this\.state\.results\.length[\s\S]{0,240}dictEngine\.search/, '结果 token 丢失时必须按 query 恢复结果')

for (const file of ['page/detail.js', 'page/results.js', 'page/history.js', 'page/favorites.js', 'page/settings.js']) {
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /back\(\{/, `${file} 必须使用官方无参 back()`)
}

const detail = fs.readFileSync('page/detail.js', 'utf8')
assert.match(detail, /import \{ getGaokaoCountdownText \} from '\.\.\/utils\/gaokao'/, '详情页必须导入高考倒计时函数，避免开启开关后运行时崩溃')
assert.match(detail, /dictEngine\.lookupDefinition\(/, '详情页缺失释义时必须重新查询精确释义')
assert.match(detail, /this\.state\.fullDef\s*=\s*this\.state\.definition/, '详情页必须把最终释义同步到 fullDef')
assert.doesNotMatch(detail, /replace\(\{\s*url:\s*'page\/results'/, '详情返回结果页必须复用已有页面，不能 replace 重建空页')

console.log('PASS: 详情释义与返回路由回归')
