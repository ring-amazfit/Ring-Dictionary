import assert from 'node:assert/strict'
import { getGaokaoCountdownText } from '../utils/gaokao.js'

const translate = key => ({
  gaokaoPrefix: 'DAYS UNTIL ',
  gaokaoYearInfix: ' GAAOKAO: ',
  gaokaoDaysSuffix: ' DAYS'
}[key] || key)

const value = getGaokaoCountdownText(new Date(2026, 5, 7), translate)
assert.equal(value, 'DAYS UNTIL 2026 GAAOKAO: 0 DAYS')
console.log('PASS: 高考倒计时支持显式翻译函数')
