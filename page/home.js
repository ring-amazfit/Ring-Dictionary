import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { push } from '@zos/router'
import { fuzzyMatchPinyin } from '../utils/pinyin'
import dictEngine from '../utils/dict-engine'
import { storage } from '../utils/storage'
import { getGaokaoCountdownText, getGaokaoDateKey } from '../utils/gaokao'
import { THEMES, SCREEN, CROWN, DECO } from '../utils/constants'
import { saveResultRoute } from '../utils/route-cache'
import { bindCrown } from '../utils/crown'
import { showToast } from '@zos/interaction'
import { setPageBrightTime, setWakeUpRelaunch } from '@zos/display'
import { getText } from '@zos/i18n'

function parseParams(params) {
  if (!params) return {}
  var p = params
  if (typeof p === 'string') {
    try { p = JSON.parse(p) } catch (e) { p = {} }
  }
  return p || {}
}

// 按官方表冠规范：bindCrown 内部完成 KEY_HOME、degree 类型、Math.sign 和轻节流。

Page({
  state: {
    query: '',
    theme: 'dark',
    autoComplete: true,
    chineseMode: false,
    pinyin: '',
    cursor: 0,
    candidates: [],
    candidatePage: 0
  },

  onInit(params) {
    try {
      // 当前页面显示 10 秒，使用 Zepp OS 合法范围 [1000, 2147483000]
      setPageBrightTime({ brightTime: 10000 })
      setWakeUpRelaunch({ relaunch: true })
    } catch (e) {}
    this.state.theme = storage.getTheme()
    var settings = storage.getSettings()
    this.state.autoComplete = settings.autoComplete !== false
    this.state.debugInfo = settings.debugInfo === true
    this.state.gaokaoCountdown = settings.gaokaoCountdown === true
    var p = parseParams(params)
    if (p.query !== undefined) this.state.query = p.query || ''
    this.state.cursor = this.state.query.length
  },

  build() {
    var self = this
    var th = this.state.theme === 'dark' ? THEMES.dark : THEMES.light
    this.theme = th
    var chMode = this.state.chineseMode

    createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: px(480), h: px(480), radius: px(240), color: th.bg
    })
    createWidget(widget.ARC, {
      x: px(DECO.outerRing.x), y: px(DECO.outerRing.y),
      w: px(DECO.outerRing.w), h: px(DECO.outerRing.h), start_angle: 0, end_angle: 360,
      color: th.border, line_width: px(DECO.outerRing.lineWidth)
    })

    createWidget(widget.TEXT, {
      x: px(120), y: px(34), w: px(100), h: px(18), text_size: px(13),
      color: th.textSecondary, align_h: align.LEFT, align_v: align.CENTER_V,
      text: chMode ? getText('modeChinese') : getText('modeEnglish')
    })
    this.modeBtn = createWidget(widget.BUTTON, {
      x: px(300), y: px(30), w: px(56), h: px(24), radius: px(12),
      text: chMode ? getText('switchToEnglish') : getText('switchToChinese'), text_size: px(11),
      color: th.accent, press_color: th.border, normal_color: th.accentSoft,
      click_func: function() { self._toggleMode() }
    })
    createWidget(widget.FILL_RECT, {
      x: px(78), y: px(64), w: px(324), h: px(44), radius: px(22), color: th.keyboardBg
    })
    createWidget(widget.FILL_RECT, {
      x: px(82), y: px(72), w: px(3), h: px(28), radius: px(1.5), color: th.accent
    })
    this.searchText = createWidget(widget.TEXT, {
      x: px(112), y: px(68), w: px(172), h: px(36), text_size: px(20),
      color: th.text, align_h: align.LEFT, align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE,
      text: this._displayQuery() || (chMode ? getText('inputChinese') : getText('inputWord'))
    })
    createWidget(widget.BUTTON, {
      x: px(280), y: px(73), w: px(36), h: px(26), radius: px(13),
      text: getText('clear'), text_size: px(13), color: th.textSecondary,
      press_color: th.border, normal_color: th.panel,
      click_func: function() { self._clearInput() }
    })
    createWidget(widget.BUTTON, {
      x: px(324), y: px(70), w: px(52), h: px(32), radius: px(16),
      text: getText('searchShort'), text_size: px(16), color: 0xffffff,
      press_color: th.success, normal_color: th.accent,
      click_func: function() { self._doSearch() }
    })

    this.pinyinText = createWidget(widget.TEXT, {
      x: px(78), y: px(112), w: px(240), h: px(20), text_size: px(16), color: th.accent,
      align_h: align.LEFT, align_v: align.CENTER_V, text_style: text_style.TRUNCATE, text: ''
    })
    this.candidateTexts = []
    this.candidateBtns = []
    for (var i = 0; i < SCREEN.CANDIDATES_PER_PAGE; i++) {
      var bx = px(68) + i * px(120)
      this.candidateTexts[i] = createWidget(widget.TEXT, {
        x: bx + px(20), y: px(132), w: px(80), h: px(38), text_size: px(30),
        color: th.text, align_h: align.CENTER_H, align_v: align.CENTER_V, text: ''
      })
      this.candidateBtns[i] = createWidget(widget.BUTTON, {
        x: bx, y: px(174), w: px(104), h: px(28), radius: px(14),
        text: (i + 1) + '', text_size: px(13), color: th.text,
        press_color: th.border, normal_color: th.keyboardKey,
        click_func: (function(idx) { return function() { self._selectCandidate(idx) } })(i)
      })
    }
    this.prevCandBtn = createWidget(widget.BUTTON, {
      x: px(10), y: px(178), w: px(48), h: px(24), radius: px(12), text: ' ', text_size: px(14),
      color: th.text, press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { self._changeCandidatePage(-1) }
    })
    this.nextCandBtn = createWidget(widget.BUTTON, {
      x: px(422), y: px(178), w: px(48), h: px(24), radius: px(12), text: ' ', text_size: px(14),
      color: th.text, press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { self._changeCandidatePage(1) }
    })
    this.pageText = createWidget(widget.TEXT, {
      x: px(340), y: px(114), w: px(52), h: px(18), text_size: px(13),
      color: th.textSecondary, align_h: align.CENTER_H, align_v: align.CENTER_V, text: ''
    })
    this.suggestText = createWidget(widget.TEXT, {
      x: px(60), y: px(204), w: px(360), h: px(20), text_size: px(13),
      color: th.textSecondary, align_h: align.LEFT, align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE, text: ''
    })
    this.loadingText = createWidget(widget.TEXT, {
      x: px(60), y: px(222), w: px(360), h: px(14), text_size: px(11),
      color: th.textSecondary, align_h: align.CENTER_H, align_v: align.CENTER_V,
      text: getText('waitingSearch')
    })
    if (this.state.debugInfo) {
      this.debugText = createWidget(widget.TEXT, {
        x: px(60), y: px(238), w: px(360), h: px(14), text_size: px(10), color: th.textSecondary,
        align_h: align.CENTER_H, align_v: align.CENTER_V, text: ''
      })
    }
    this._renderQwerty(th)
    this._renderFooter(th)
    this._updateModeWidgets()
    this._updateCandidates()
    this._updateSuggestions()
    this._maybeShowGaokaoToast()
    // 拼音候选翻页的表冠节流比默认更宽松（350ms）：Balance 等设备旋转一圈会
    // 连发多个事件，默认 130ms 会一旋翻好几页。其他页面仍用 bindCrown 默认值。
    this._unbindCrown = bindCrown(function(step) {
      if (self.state.chineseMode && self.state.candidates.length > SCREEN.CANDIDATES_PER_PAGE) {
        self._changeCandidatePage(step)
      }
    }, 350)
  },

  _renderQwerty(th) {
    var self = this
    var keys = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l'], ['z','x','c','v','b','n','m']]
    var keyW = px(32), keyH = px(32), gap = px(5), startY = px(250), rowGap = px(37)
    for (var ri = 0; ri < keys.length; ri++) {
      var row = keys[ri]
      var rowY = startY + ri * rowGap
      var rowWidth = row.length * keyW + (row.length - 1) * gap
      var startX = px(240) - rowWidth / 2
      for (var ci = 0; ci < row.length; ci++) {
        var k = row[ci]
        createWidget(widget.BUTTON, {
          x: startX + ci * (keyW + gap), y: rowY, w: keyW, h: keyH, radius: px(10),
          text: k.toUpperCase(), text_size: px(17), color: th.text,
          press_color: th.accent, normal_color: th.keyboardKey,
          click_func: (function(key) { return function() { self._onKey(key) } })(k)
        })
      }
    }
    createWidget(widget.BUTTON, {
      x: px(56), y: px(362), w: px(74), h: px(32), radius: px(12),
      text: getText('backspace'), text_size: px(18), color: th.text,
      press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { self._onBackspace() }
    })
    createWidget(widget.BUTTON, {
      x: px(138), y: px(362), w: px(42), h: px(32), radius: px(12), text: '←', text_size: px(18),
      color: th.text, press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { self._moveCursor(-1) }
    })
    createWidget(widget.BUTTON, {
      x: px(188), y: px(362), w: px(42), h: px(32), radius: px(12), text: '→', text_size: px(18),
      color: th.text, press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { self._moveCursor(1) }
    })
    createWidget(widget.BUTTON, {
      x: px(258), y: px(362), w: px(104), h: px(32), radius: px(12),
      text: getText('search'), text_size: px(14), color: 0xffffff,
      press_color: th.success, normal_color: th.accent,
      click_func: function() { self._doSearch() }
    })
  },

  _renderFooter(th) {
    var self = this
    var navs = [
      { text: getText('history'), url: 'page/history' },
      { text: getText('favorites'), url: 'page/favorites' },
      { text: getText('settings'), url: 'page/settings' },
      { text: getText('about'), url: 'page/about' },
      { text: getText('random'), random: true }
    ]
    var total = navs.length, bw = 52, gap = 6
    var startX = 240 - (total * bw + (total - 1) * gap) / 2
    for (var i = 0; i < total; i++) {
      (function(nav, idx) {
        var isAccent = !!nav.random
        createWidget(widget.BUTTON, {
          x: px(startX) + idx * px(bw + gap), y: px(400), w: px(bw), h: px(22), radius: px(11),
          text: nav.text, text_size: px(12), color: isAccent ? 0xffffff : th.textSecondary,
          press_color: isAccent ? th.success : th.border,
          normal_color: isAccent ? th.accent : th.bg,
          click_func: nav.random ? function() { self._doRandom() } : function() { push({ url: nav.url, anim: true }) }
        })
      })(navs[i], i)
    }
  },

  _maybeShowGaokaoToast() {
    if (!this.state.gaokaoCountdown) return
    var settings = storage.getSettings()
    var today = getGaokaoDateKey()
    if (settings.gaokaoLastNoticeDate === today) return
    settings.gaokaoLastNoticeDate = today
    storage.saveSettings(settings)
    try { showToast({ content: getGaokaoCountdownText(undefined, getText) }) } catch (e) {}
  },

  _displayQuery() {
    var q = this.state.query || ''
    return q.slice(0, this.state.cursor) + '|' + q.slice(this.state.cursor)
  },

  _refreshSearchText() {
    var placeholder = this.state.chineseMode ? getText('inputChinese') : getText('inputWord')
    this.searchText.setProperty(prop.MORE, { text: this._displayQuery() || placeholder })
  },

  _toggleMode() {
    this.state.chineseMode = !this.state.chineseMode
    this.state.pinyin = ''
    this.state.candidates = []
    this.state.candidatePage = 0
    this.state.cursor = this.state.query.length
    this._updateModeWidgets()
    this._updateCandidates()
    this._updateSuggestions()
  },

  _updateModeWidgets() {
    var chMode = this.state.chineseMode
    var placeholder = chMode ? getText('inputChinese') : getText('inputWord')
    this.modeBtn.setProperty(prop.MORE, { text: chMode ? getText('switchToEnglish') : getText('switchToChinese') })
    this.searchText.setProperty(prop.MORE, { text: this._displayQuery() || placeholder })
    this.pinyinText.setProperty(prop.MORE, {
      text: chMode ? (this.state.pinyin ? getText('pinyinPrefix') + this.state.pinyin : getText('pinyinHint')) : ''
    })
  },

  _clearInput() {
    if (this.state.chineseMode) {
      this.state.pinyin = ''
      this.state.candidates = []
      this.state.candidatePage = 0
      this._updateModeWidgets()
      this._updateCandidates()
    } else {
      this.state.query = ''
      this.state.cursor = 0
      this._refreshSearchText()
      this._updateSuggestions()
    }
  },

  _onKey(k) {
    if (this.state.chineseMode) {
      this.state.pinyin += k
      this.state.candidatePage = 0
      this._updateModeWidgets()
      this._updateCandidates()
    } else this._insertAtCursor(k)
  },

  _insertAtCursor(text) {
    if (!text) return
    var cur = Math.max(0, Math.min(this.state.query.length, this.state.cursor))
    this.state.query = this.state.query.slice(0, cur) + text + this.state.query.slice(cur)
    this.state.cursor = cur + text.length
    this._refreshSearchText()
    this._updateSuggestions()
  },

  _onBackspace() {
    if (this.state.chineseMode) {
      if (this.state.pinyin.length > 0) {
        this.state.pinyin = this.state.pinyin.slice(0, -1)
        this.state.candidatePage = 0
        this._updateModeWidgets()
        this._updateCandidates()
      } else if (this.state.query.length > 0 && this.state.cursor > 0) {
        this.state.query = this.state.query.slice(0, this.state.cursor - 1) + this.state.query.slice(this.state.cursor)
        this.state.cursor = Math.max(0, this.state.cursor - 1)
        this._refreshSearchText()
        this._updateSuggestions()
      }
    } else if (this.state.query.length > 0 && this.state.cursor > 0) {
      this.state.cursor = Math.max(0, this.state.cursor - 1)
      this.state.query = this.state.query.slice(0, this.state.cursor) + this.state.query.slice(this.state.cursor + 1)
      this._refreshSearchText()
      this._updateSuggestions()
    }
  },

  _moveCursor(step) {
    this.state.cursor = Math.max(0, Math.min(this.state.query.length, this.state.cursor + step))
    this._refreshSearchText()
  },

  _updateSuggestions() {
    if (!this.state.chineseMode && this.state.autoComplete && this.state.query) {
      var sugs = dictEngine.fastSuggestions(this.state.query, 3)
      this.suggestText.setProperty(prop.MORE, {
        text: sugs.length ? (getText('suggestionPrefix') + ': ' + sugs.join('   ')) : ''
      })
    } else this.suggestText.setProperty(prop.MORE, { text: '' })
  },

  _updateCandidates() {
    var pinyin = this.state.pinyin.toLowerCase()
    var allChars = []
    if (pinyin) {
      var matches = fuzzyMatchPinyin(pinyin)
      for (var m = 0; m < matches.length; m++) {
        for (var c = 0; c < matches[m].chars.length; c++) {
          if (allChars.indexOf(matches[m].chars[c]) === -1) allChars.push(matches[m].chars[c])
        }
      }
    }
    // 字库精简后单音节最多 62 字（ji）；模糊匹配会合并多个音节，仍保留一个
    // 较高的总上限（96）防止候选爆炸，但不再截断任何单个音节的完整候选。
    if (allChars.length > 96) allChars = allChars.slice(0, 96)
    this.state.candidates = allChars
    var perPage = SCREEN.CANDIDATES_PER_PAGE
    var maxPage = Math.ceil(allChars.length / perPage) - 1
    if (maxPage < 0) maxPage = 0
    if (this.state.candidatePage > maxPage) this.state.candidatePage = maxPage
    var start = this.state.candidatePage * perPage
    for (var i = 0; i < perPage; i++) {
      var idx = start + i
      var text = idx < allChars.length ? allChars[idx] : ''
      this.candidateTexts[i].setProperty(prop.MORE, { text: text })
      this.candidateBtns[i].setProperty(prop.MORE, { text: text ? (i + 1) + '' : '' })
    }
    this.pageText.setProperty(prop.MORE, {
      text: allChars.length > perPage ? ((this.state.candidatePage + 1) + '/' + (maxPage + 1)) : ''
    })
    var chMode = this.state.chineseMode
    var hasPages = chMode && allChars.length > perPage
    var showPrev = hasPages && this.state.candidatePage > 0
    var showNext = hasPages && this.state.candidatePage < maxPage
    this.prevCandBtn.setProperty(prop.MORE, { text: showPrev ? '←' : ' ' })
    this.nextCandBtn.setProperty(prop.MORE, { text: showNext ? '→' : ' ' })
  },

  _changeCandidatePage(step) {
    var perPage = SCREEN.CANDIDATES_PER_PAGE
    var maxPage = Math.ceil(this.state.candidates.length / perPage) - 1
    var next = this.state.candidatePage + step
    if (next < 0) next = 0
    if (next > maxPage) next = maxPage
    if (next !== this.state.candidatePage) {
      this.state.candidatePage = next
      this._updateCandidates()
    }
  },

  _selectCandidate(idx) {
    var actualIdx = this.state.candidatePage * SCREEN.CANDIDATES_PER_PAGE + idx
    if (actualIdx < this.state.candidates.length) {
      var value = this.state.candidates[actualIdx]
      var cur = Math.max(0, Math.min(this.state.query.length, this.state.cursor))
      this.state.query = this.state.query.slice(0, cur) + value + this.state.query.slice(cur)
      this.state.cursor = cur + value.length
      this.state.pinyin = ''
      this.state.candidates = []
      this.state.candidatePage = 0
      this._refreshSearchText()
      this._updateModeWidgets()
      this._updateCandidates()
    }
  },

  _doSearch() {
    var q = this.state.query.trim()
    if (!q) return
    globalThis.__t_searchStart = Date.now()
    this.loadingText.setProperty(prop.MORE, {
      text: this.state.chineseMode ? getText('searchingChinese') : getText('searchingEnglish')
    })
    globalThis.__t_engineStart = Date.now()
    var list = dictEngine.search(q)
    globalThis.__t_searchEnd = Date.now()
    globalThis.__t_engineEnd = globalThis.__t_searchEnd
    if (list.length === 0) list.push({ word: q, definition: getText('notFoundDefinition'), exact: false })
    this.loadingText.setProperty(prop.MORE, {
      text: getText('searchCompletePrefix') + list.length + getText('searchCompleteSuffix')
    })
    globalThis.__t_paramsStart = Date.now()
    var routeToken = saveResultRoute({ query: q, results: list, reads: dictEngine.lastReads || 0 })
    var routeParams = JSON.stringify({ query: q, token: routeToken, reads: dictEngine.lastReads || 0 })
    globalThis.__t_paramsEnd = Date.now()
    globalThis.__t_routeStart = globalThis.__t_paramsEnd
    if (this.debugText) this.debugText.setProperty(prop.MORE, { text: 'R=' + (dictEngine.lastReads || 0) + ' · ' + getText('searchComplete') })
    push({ url: 'page/results', params: routeParams, anim: false })
  },

  _doRandom() {
    var e = dictEngine.randomWord()
    if (!e || !e.word) return
    storage.addHistory(e.word)
    push({
      url: 'page/detail',
      params: JSON.stringify({ word: e.word, definition: e.definition || getText('notFoundDefinition'), phonetic: '', suggestions: [] }),
      anim: true
    })
  },

  onDestroy() {
    if (this._unbindCrown) this._unbindCrown()
  }
})
