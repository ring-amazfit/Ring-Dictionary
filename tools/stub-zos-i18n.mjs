import fs from 'node:fs'
const po = fs.readFileSync(new URL('../page/i18n/zh-CN.po', import.meta.url), 'utf8')
const poMap = {}
for (const b of po.split('\n\n')) {
  const m = b.match(/msgid "([^"]+)"\nmsgstr "([^"]*)"/)
  if (m) poMap[m[1]] = m[2]
}
export const getText = (key) => poMap[key] !== undefined ? poMap[key] : key
export const gettext = (key) => poMap[key] !== undefined ? poMap[key] : key
