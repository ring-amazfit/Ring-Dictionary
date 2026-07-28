import { sessionStorage } from '@zos/storage'

// 页面脚本切换后不保证共享同一个 globalThis，因此结果路由必须使用官方 sessionStorage。
// 路由页在 back() 后会再次执行 onInit/build，所以结果不能在第一次读取时删除。
var STORAGE_KEY = 'dict_result_route_v1'
var GLOBAL_KEY = '__ringDictResultRoute'
var MAX_ROUTES = 4
var serial = 0

function readRoutes() {
  try {
    var raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    var parsed = JSON.parse(raw)
    // 兼容此前只保存一个 entry 的实验版本。
    if (parsed && parsed.token) return [parsed]
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

function writeRoutes(routes) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(routes)) } catch (e) {}
}

export function saveResultRoute(payload) {
  serial = (serial + 1) % 1000000
  var token = String(Date.now()) + '-' + String(serial)
  var entry = { token: token, payload: payload }
  var routes = readRoutes().filter(function(item) { return item && item.token !== token })
  routes.unshift(entry)
  if (routes.length > MAX_ROUTES) routes = routes.slice(0, MAX_ROUTES)
  // 保留快速路径；跨 page 的可靠路径是 sessionStorage。
  globalThis[GLOBAL_KEY] = entry
  writeRoutes(routes)
  return token
}

export function consumeResultRoute(token) {
  var fast = globalThis[GLOBAL_KEY]
  if (fast && fast.token === token) return fast.payload || null
  var routes = readRoutes()
  for (var i = 0; i < routes.length; i++) {
    if (routes[i] && routes[i].token === token) {
      globalThis[GLOBAL_KEY] = routes[i]
      // 不删除：Zepp OS 在从详情 back() 回到结果页时会再次执行 onInit。
      return routes[i].payload || null
    }
  }
  return null
}
