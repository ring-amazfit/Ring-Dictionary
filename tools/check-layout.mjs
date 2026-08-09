// 布局验证：渲染所有页面，捕获 BUTTON 实际坐标，检查重叠与越界。
// 运行：node --loader ./tools/loader.mjs tools/check-layout.mjs
let lastPage = null
globalThis.Page = (def) => { lastPage = def }

const widgets = []
globalThis.__captureWidget = (type, opts) => widgets.push({ type, opts })

const { getText } = await import('./stub-zos-i18n.mjs')

async function capturePage(path, q) {
  lastPage = null
  widgets.length = 0
  await import('../' + path + '?h=' + q)
  return lastPage
}

function run(def, params) {
  const inst = Object.assign({}, def, { state: JSON.parse(JSON.stringify(def.state || {})) })
  inst.onInit && inst.onInit(params)
  inst.build && inst.build()
  inst.onDestroy && inst.onDestroy()
  return inst
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

async function checkPage(name, path, params) {
  const def = await capturePage(path, name)
  run(def, params)
  const ws = widgets.slice()
  const btns = ws.filter(w => w.type === 'BUTTON').map(w => w.opts).filter(o =>
    typeof o.x === 'number' && typeof o.y === 'number' && typeof o.w === 'number' && typeof o.h === 'number')
  const problems = []
  // 重叠检查（阈值 3px）
  for (let i = 0; i < btns.length; i++) {
    for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j]
      if (a.h <= 0 || b.h <= 0) continue
      if (intersects(a, b)) {
        const overlapW = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const overlapH = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        if (overlapW > 3 && overlapH > 3) {
          problems.push(`重叠: [${a.x},${a.y},${a.w},${a.h}] vs [${b.x},${b.y},${b.w},${b.h}]`)
        }
      }
    }
    // 越界检查
    const o = btns[i]
    if (o.x < -2 || o.y < -2 || o.x + o.w > 482 || o.y + o.h > 482) {
      problems.push(`越界: [${o.x},${o.y},${o.w},${o.h}]`)
    }
  }
  if (problems.length) {
    console.log(`✗ ${name}`)
    for (const p of problems) console.log('   ' + p)
  } else {
    console.log(`✓ ${name}（${btns.length} 个按钮，无重叠/越界）`)
  }
}

await checkPage('home', 'page/home.js', undefined)
await checkPage('results', 'page/results.js', JSON.stringify({ query: 'pen', token: '', results: JSON.stringify([{ word: 'pen', definition: 'n钢笔', exact: true }]) }))
await checkPage('detail', 'page/detail.js', JSON.stringify({ word: 'pen', definition: 'n钢笔'.repeat(30) + ' ' + 'x'.repeat(300), phonetic: 'pen', suggestions: [{ word: 'pencil', definition: 'n铅笔' }, { word: 'penny', definition: 'n便士' }, { word: 'penalty', definition: 'n处罚' }], resultToken: '' }))
await checkPage('history', 'page/history.js', undefined)
await checkPage('favorites', 'page/favorites.js', undefined)
await checkPage('settings', 'page/settings.js', undefined)
await checkPage('about', 'page/about.js', undefined)
