import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { push, back } from '@zos/router'
import { getText } from '@zos/i18n'
import { sessionStorage } from '@zos/storage'
import dictEngine from '../utils/dict-engine'
import { storage } from '../utils/storage'
import { THEMES, SCREEN, CROWN, DECO } from '../utils/constants'
import { bindCrown } from '../utils/crown'

// 历史页页码持久化：从详情 back() 返回时恢复原页码，避免跳回第 1 页。
var PAGE_KEY = 'dict_history_page_v1'
function savePage(p) {
  try { sessionStorage.setItem(PAGE_KEY, String(p)) } catch (e) {}
}
function loadPage() {
  try {
    var v = sessionStorage.getItem(PAGE_KEY)
    return v ? parseInt(v, 10) || 0 : 0
  } catch (e) { return 0 }
}

// 表冠由 bindCrown 统一按官方规范处理：KEY_HOME + 有效 degree + Math.sign + 轻节流。

Page({
  state: {
    history: [],
    theme: 'dark',
    page: 0
  },

  onInit() {
    this.state.history = storage.getHistory()
    this.state.theme = storage.getTheme()
    this.state.lastCrownTs = 0
    this.state.page = loadPage()
  },

  build() {
    var self = this
    this.theme = this.state.theme === 'dark' ? THEMES.dark : THEMES.light
    var th = this.theme

    // 背景
    createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: px(480), h: px(480), radius: px(240),
      color: th.bg
    })

    // 装饰外环
    createWidget(widget.ARC, {
      x: px(DECO.outerRing.x), y: px(DECO.outerRing.y),
      w: px(DECO.outerRing.w), h: px(DECO.outerRing.h),
      start_angle: 0, end_angle: 360,
      color: th.border,
      line_width: px(DECO.outerRing.lineWidth)
    })

    // 标题 + 装饰线
    createWidget(widget.FILL_RECT, {
      x: px(100), y: px(44), w: px(40), h: px(3),
      radius: px(2), color: th.accent
    })
    createWidget(widget.TEXT, {
      x: px(100), y: px(48), w: px(200), h: px(32),
      text_size: px(24),
      color: th.text,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: getText('historyTitle')
    })

    // 页码
    this.pageText = createWidget(widget.TEXT, {
      x: px(300), y: px(50), w: px(80), h: px(22),
      text_size: px(14),
      color: th.textSecondary,
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      text: ''
    })

    // 列表项
    this.wordTexts = []
    this.viewBtns = []
    this.deleteBtns = []
    for (var i = 0; i < SCREEN.HISTORY_PER_PAGE; i++) {
      var y = px(84) + i * px(44)

      // 行背景
      createWidget(widget.FILL_RECT, {
        x: px(60), y: y, w: px(360), h: px(36),
        radius: px(16), color: th.keyboardBg
      })

      // 序号
      createWidget(widget.TEXT, {
        x: px(68), y: y + px(8), w: px(30), h: px(20),
        text_size: px(12),
        color: th.textSecondary,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: ''
      })

      this.wordTexts[i] = createWidget(widget.TEXT, {
        x: px(96), y: y + px(6), w: px(190), h: px(24),
        text_size: px(18),
        color: th.text,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.TRUNCATE,
        text: ''
      })
      this.viewBtns[i] = createWidget(widget.BUTTON, {
        x: px(294), y: y + px(1), w: px(82), h: px(34),
        radius: px(17),
        text: getText('viewDetail'),
        text_size: px(13),
        color: 0xffffff,
        press_color: th.success,
        normal_color: th.accent,
        click_func: (function(idx) {
          return function() {
            var w = self.state.history[self.state.page * SCREEN.HISTORY_PER_PAGE + idx]
            if (w) self._open(w)
          }
        })(i)
      })
      this.deleteBtns[i] = createWidget(widget.BUTTON, {
        x: px(376), y: y + px(1), w: px(42), h: px(34),
        radius: px(17),
        text: getText('deleteShort'),
        text_size: px(13),
        color: 0xffffff,
        press_color: th.danger,
        normal_color: th.danger,
        click_func: (function(idx) {
          return function() {
            var w = self.state.history[self.state.page * SCREEN.HISTORY_PER_PAGE + idx]
            if (w) self._delete(w)
          }
        })(i)
      })
    }

    var navY = px(386)
    var navBW = px(68)
    var navGap = px(8)
    var navStartX = px(92)
    createWidget(widget.BUTTON, {
      x: navStartX, y: navY, w: navBW, h: px(38),
      radius: px(17),
      text: getText('previousPage'), text_size: px(14),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { self._changePage(-1) }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap), y: navY, w: navBW, h: px(38),
      radius: px(17),
      text: getText('back'), text_size: px(14),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { back() }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap) * 2, y: navY, w: navBW, h: px(38),
      radius: px(17),
      text: getText('clearHistory'), text_size: px(14),
      color: 0xffffff,
      press_color: th.danger,
      normal_color: th.danger,
      click_func: function() { self.clearAll() }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap) * 3, y: navY, w: navBW, h: px(38),
      radius: px(17),
      text: getText('nextPage'), text_size: px(14),
      color: 0xffffff,
      press_color: th.success,
      normal_color: th.accent,
      click_func: function() { self._changePage(1) }
    })

    this._renderPage()

    // 表冠（官方规范 + 轻节流）
    this._unbindCrown = bindCrown(function(step) { self._changePage(step) })
  },

  _renderPage() {
    var perPage = SCREEN.HISTORY_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(this.state.history.length / perPage) - 1)
    if (this.state.page > maxPage) this.state.page = maxPage
    var start = this.state.page * perPage

    for (var i = 0; i < perPage; i++) {
      var word = this.state.history[start + i]
      if (word) {
        this.wordTexts[i].setProperty(prop.MORE, { text: word })
        this.viewBtns[i].setProperty(prop.MORE, { text: getText('viewDetail') })
        this.deleteBtns[i].setProperty(prop.MORE, { text: getText('deleteShort') })
      } else {
        this.wordTexts[i].setProperty(prop.MORE, { text: '' })
        this.viewBtns[i].setProperty(prop.MORE, { text: ' ' })
        this.deleteBtns[i].setProperty(prop.MORE, { text: ' ' })
      }
    }

    this.pageText.setProperty(prop.MORE, {
      text: maxPage > 0 ? ((this.state.page + 1) + '/' + (maxPage + 1)) : ''
    })
  },

  _open(word) {
    savePage(this.state.page)
    var r = dictEngine.lookup(word.toLowerCase())
    var def = (r && r.definition && r.definition !== getText('notFoundDefinition')) ? r.definition : getText('notFoundDefinition')
    push({
      url: 'page/detail',
      params: JSON.stringify({ word: word, definition: def, phonetic: '', suggestions: r ? r.suggestions : [] }),
      anim: true
    })
  },

  _delete(word) {
    storage.removeHistory(word)
    this.state.history = storage.getHistory()
    var maxPage = Math.max(0, Math.ceil(this.state.history.length / SCREEN.HISTORY_PER_PAGE) - 1)
    if (this.state.page > maxPage) this.state.page = maxPage
    this._renderPage()
    savePage(this.state.page)
  },

  _changePage(step) {
    var perPage = SCREEN.HISTORY_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(this.state.history.length / perPage) - 1)
    var next = this.state.page + step
    if (next < 0) next = 0
    if (next > maxPage) next = maxPage
    if (next !== this.state.page) {
      this.state.page = next
      this._renderPage()
      savePage(next)
    }
  },

  clearAll() {
    storage.clearHistory()
    this.state.history = []
    this.state.page = 0
    this._renderPage()
    savePage(0)
  },

  onDestroy() {
    if (this._unbindCrown) this._unbindCrown()
  }
})
