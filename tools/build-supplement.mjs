// 从可编辑的 supplement.txt 生成运行时内置数据。
// 运行：node tools/build-supplement.mjs
import fs from 'node:fs'

const source = 'assets/common/dic/supplement.txt'
const target = 'utils/supplement-data.js'
const lines = fs.readFileSync(source, 'utf8').split(/\r?\n/).filter(Boolean)
const data = lines.map(line => {
  const tab = line.indexOf('\t')
  if (tab <= 0) throw new Error('invalid supplement line: ' + line)
  return { w: line.slice(0, tab).trim().toLowerCase(), d: line.slice(tab + 1).trim() }
})
fs.writeFileSync(target,
  '// AUTO-GENERATED from assets/common/dic/supplement.txt.\n' +
  '// Keep the txt file as the editable source; regenerate after changes.\n' +
  'export const SUPPLEMENT_DATA = ' + JSON.stringify(data) + '\n'
)
console.log('wrote', target, data.length + ' entries')
