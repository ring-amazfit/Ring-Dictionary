// 字典页面统一表冠适配。
// 遵循 Zepp OS 官方规则：只接受 KEY_HOME + 有效 degree，按 Math.sign 直接响应，
// 不累加阈值；130ms 轻节流只用于防止连续事件重复刷新页面。
import { onDigitalCrown, offDigitalCrown, KEY_HOME } from '@zos/interaction'

export function crownDirection(key, degree) {
  if (key !== KEY_HOME || typeof degree !== 'number' || degree === 0) return 0
  return Math.sign(degree)
}

export function bindCrown(onStep, throttleMs) {
  var lastTs = 0
  var gap = throttleMs === undefined ? 130 : throttleMs
  try {
    onDigitalCrown({
      callback: function(key, degree) {
        var step = crownDirection(key, degree)
        if (!step) return
        var now = Date.now()
        if (now - lastTs < gap) return
        lastTs = now
        onStep(step)
      }
    })
  } catch (e) {}

  return function unbindCrown() {
    try { offDigitalCrown() } catch (e) {}
  }
}
