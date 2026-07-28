var DAY_MS = 24 * 60 * 60 * 1000
var EXAM_MONTH = 5
var EXAM_DAY = 7

function dateOnly(value) {
  var source = value instanceof Date ? value : new Date()
  return new Date(source.getFullYear(), source.getMonth(), source.getDate())
}

export function getGaokaoCountdown(now) {
  var today = dateOnly(now)
  var year = today.getFullYear()
  var target = new Date(year, EXAM_MONTH, EXAM_DAY)
  if (today.getTime() > target.getTime()) {
    year += 1
    target = new Date(year, EXAM_MONTH, EXAM_DAY)
  }
  var days = Math.max(0, Math.round((target.getTime() - today.getTime()) / DAY_MS))
  return { year: year, days: days }
}

export function getGaokaoCountdownText(now, translate) {
  var value = getGaokaoCountdown(now)
  var t = typeof translate === 'function' ? translate : function(key) {
    if (key === 'gaokaoPrefix') return '距离'
    if (key === 'gaokaoYearInfix') return '年高考还有'
    return '天'
  }
  return t('gaokaoPrefix') + value.year + t('gaokaoYearInfix') + value.days + t('gaokaoDaysSuffix')
}

export function getGaokaoDateKey(now) {
  var d = dateOnly(now)
  var month = d.getMonth() + 1
  var day = d.getDate()
  return d.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day
}
