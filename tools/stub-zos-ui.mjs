// Node-only stub for @zos/ui（页面布局/渲染测试用；支持捕获 widget 做几何审计）
export const createWidget = (type, opts) => {
  const obj = { type, opts, _props: {} }
  obj.setProperty = (key, val) => { obj._props[key] = val }
  if (globalThis.__captureWidget) globalThis.__captureWidget(type, opts)
  return obj
}
export const widget = new Proxy({}, { get: (t, k) => k })
export const text_style = new Proxy({}, { get: (t, k) => k })
export const align = new Proxy({}, { get: (t, k) => k })
export const prop = new Proxy({}, { get: (t, k) => k })
