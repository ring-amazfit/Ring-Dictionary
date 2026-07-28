import assert from 'node:assert/strict'
import fs from 'node:fs'

const pageFiles = [
  'page/about.js',
  'page/detail.js',
  'page/favorites.js',
  'page/history.js',
  'page/home.js',
  'page/results.js',
  'page/settings.js'
]
const requiredPageKeys = [
  'appTitle', 'version', 'openSourceScan', 'sourceCode', 'sourceRepo', 'return',
  'back', 'searchDictionary', 'relatedWords', 'favorite', 'favorited',
  'segmentPrefix', 'segmentSuffix', 'modeChinese', 'modeEnglish',
  'switchToChinese', 'switchToEnglish', 'inputChinese', 'inputWord',
  'clear', 'searchShort', 'pinyinPrefix', 'pinyinHint', 'waitingSearch', 'searchingChinese',
  'searchingEnglish', 'searchCompletePrefix', 'searchCompleteSuffix', 'searchComplete',
  'suggestionPrefix', 'backspace', 'search', 'history', 'favorites', 'settings', 'about',
  'random', 'notFoundDefinition', 'clickToViewDefinition', 'searchResultsTitle',
  'resultCountSuffix', 'openDetail', 'expandDefinition', 'expandedDefinition',
  'expandingDefinitionPrefix', 'previousPage', 'home', 'more', 'historyTitle', 'viewDetail',
  'deleteShort', 'clearHistory', 'nextPage', 'favoritesTitle', 'view', 'delete', 'top',
  'settingsTitle', 'theme', 'darkTheme', 'lightTheme', 'autoComplete', 'enabled', 'disabled',
  'definitionPrev', 'definitionNext', 'gaokaoCountdown', 'gaokaoPrefix', 'gaokaoYearInfix', 'gaokaoDaysSuffix', 'debugInfo',
  'settingsNote', 'fullKeyboardNote', 'gaokaoNote'
]
const requiredSettingKeys = [
  'settingTitle', 'watchSettings', 'watchSettingsNote', 'settingGaokao',
  'settingGaokaoNote', 'settingAbout', 'settingAboutText'
]

function poKeys(file) {
  return new Set([...fs.readFileSync(file, 'utf8').matchAll(/^msgid "([^"]+)"$/gm)].map(m => m[1]))
}
function literalKeys(source, fn) {
  return new Set([...source.matchAll(new RegExp(fn + "\\('([^']+)'\\)", 'g'))].map(m => m[1]))
}

const pagePo = poKeys('page/i18n/zh-CN.po')
const pageEnPo = poKeys('page/i18n/en-US.po')
const settingPo = poKeys('setting/i18n/zh-CN.po')
const settingEnPo = poKeys('setting/i18n/en-US.po')
for (const key of requiredPageKeys) {
  assert.ok(pagePo.has(key), `page zh-CN 缺少 ${key}`)
  assert.ok(pageEnPo.has(key), `page en-US 缺少 ${key}`)
}
for (const key of requiredSettingKeys) {
  assert.ok(settingPo.has(key), `setting zh-CN 缺少 ${key}`)
  assert.ok(settingEnPo.has(key), `setting en-US 缺少 ${key}`)
}
for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  assert.match(source, /import \{ getText \} from '@zos\/i18n'/, `${file} 必须接入 @zos/i18n`)
  for (const key of literalKeys(source, 'getText')) assert.ok(pagePo.has(key) && pageEnPo.has(key), `${file} 使用了未登记 key: ${key}`)
}
const settingSource = fs.readFileSync('setting/index.js', 'utf8')
assert.match(settingSource, /import \{ gettext \} from 'i18n'/, '手机设置页必须接入 i18n')
for (const key of literalKeys(settingSource, 'gettext')) assert.ok(settingPo.has(key) && settingEnPo.has(key), `setting 使用了未登记 key: ${key}`)
console.log('PASS: page/setting i18n key 完整且双语 PO 对齐')
