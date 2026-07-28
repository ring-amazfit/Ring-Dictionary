import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { push, back } from '@zos/router'
import { getText } from '@zos/i18n'
import { storage } from '../utils/storage'
import { THEMES, SCREEN, CROWN, DECO } from '../utils/constants'
import { bindCrown } from '../utils/crown'

// 表冠由 bindCrown 统一按官方规范处理：KEY_HOME + 有效 degree + Math.sign + 轻节流。

function trimPreview(text) {
  var value = (text || '').replace(/\s+/g, ' ').trim()
  if (value.length > 20) return value.slice(0, 20) + '…'
  return value
}

Page({
  state: {
    favorites: [],
    theme: 'dark',
    page: 0
  },

  onInit() {
    this.state.favorites = storage.getFavorites()
    this.state.theme = storage.getTheme()
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
      text: getText('favoritesTitle')
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

    // 收藏列表
    this.wordTexts = []
    this.previewTexts = []
    this.viewBtns = []
    this.delBtns = []
    for (var i = 0; i < SCREEN.FAVORITES_PER_PAGE; i++) {
      var y = px(84) + i * px(62)

      // 卡片背景
      createWidget(widget.FILL_RECT, {
        x: px(56), y: y, w: px(368), h: px(54),
        radius: px(18), color: th.keyboardBg
      })

      // 单词
      this.wordTexts[i] = createWidget(widget.TEXT, {
        x: px(66), y: y + px(6), w: px(200), h: px(20),
        text_size: px(19),
        color: th.text,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.TRUNCATE,
        text: ''
      })

      // 释义预览
      this.previewTexts[i] = createWidget(widget.TEXT, {
        x: px(66), y: y + px(28), w: px(180), h: px(16),
        text_size: px(12),
        color: th.textSecondary,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.TRUNCATE,
        text: ''
      })

      // 查看按钮
      this.viewBtns[i] = createWidget(widget.BUTTON, {
        x: px(272), y: y + px(6), w: px(72), h: px(28),
        radius: px(14),
        text: getText('view'),
        text_size: px(13),
        color: 0xffffff,
        press_color: th.success,
        normal_color: th.accent,
        click_func: (function(idx) {
          return function() {
            var item = self.state.favorites[self.state.page * SCREEN.FAVORITES_PER_PAGE + idx]
            if (item) self._open(item)
          }
        })(i)
      })

      // 删除按钮
      this.delBtns[i] = createWidget(widget.BUTTON, {
        x: px(344), y: y + px(6), w: px(68), h: px(28),
        radius: px(14),
        text: getText('delete'),
        text_size: px(13),
        color: 0xffffff,
        press_color: th.danger,
        normal_color: th.danger,
        click_func: (function(idx) {
          return function() {
            var item = self.state.favorites[self.state.page * SCREEN.FAVORITES_PER_PAGE + idx]
            if (item) self._delete(item.word)
          }
        })(i)
      })
    }

    // 底部导航（收进圆屏安全区）
    var navY = px(390)
    var navBW = px(68)
    var navGap = px(8)
    var navStartX = px(92)
    createWidget(widget.BUTTON, {
      x: navStartX, y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('previousPage'), text_size: px(14),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { self._changePage(-1) }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap), y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('back'), text_size: px(14),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { back() }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap) * 2, y: navY, w: navBW, h: px(34),
      radius: px(17),
      text: getText('top'), text_size: px(14),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { self.state.page = 0; self._renderPage() }
    })

    createWidget(widget.BUTTON, {
      x: navStartX + (navBW + navGap) * 3, y: navY, w: navBW, h: px(34),
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
    var perPage = SCREEN.FAVORITES_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(this.state.favorites.length / perPage) - 1)
    if (this.state.page > maxPage) this.state.page = maxPage
    var start = this.state.page * perPage

    for (var i = 0; i < perPage; i++) {
      var item = this.state.favorites[start + i]
      if (item) {
        this.wordTexts[i].setProperty(prop.MORE, { text: item.word })
        this.previewTexts[i].setProperty(prop.MORE, { text: trimPreview(item.definition) })
        this.viewBtns[i].setProperty(prop.MORE, { text: getText('view') })
        this.delBtns[i].setProperty(prop.MORE, { text: getText('delete') })
      } else {
        this.wordTexts[i].setProperty(prop.MORE, { text: '' })
        this.previewTexts[i].setProperty(prop.MORE, { text: '' })
        this.viewBtns[i].setProperty(prop.MORE, { text: ' ' })
        this.delBtns[i].setProperty(prop.MORE, { text: ' ' })
      }
    }

    this.pageText.setProperty(prop.MORE, {
      text: maxPage > 0 ? ((this.state.page + 1) + '/' + (maxPage + 1)) : ''
    })
  },

  _open(item) {
    push({
      url: 'page/detail',
      params: JSON.stringify({
        word: item.word,
        definition: item.definition || '',
        phonetic: '',
        suggestions: []
      }),
      anim: true
    })
  },

  _delete(word) {
    var self = this
    storage.removeFavorite(word)
    self.state.favorites = storage.getFavorites()
    var perPage = SCREEN.FAVORITES_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(self.state.favorites.length / perPage) - 1)
    if (self.state.page > maxPage) self.state.page = maxPage
    self._renderPage()
  },

  _changePage(step) {
    var perPage = SCREEN.FAVORITES_PER_PAGE
    var maxPage = Math.max(0, Math.ceil(this.state.favorites.length / perPage) - 1)
    var next = this.state.page + step
    if (next < 0) next = 0
    if (next > maxPage) next = maxPage
    if (next !== this.state.page) {
      this.state.page = next
      this._renderPage()
    }
  },

  onDestroy() {
    if (this._unbindCrown) this._unbindCrown()
  }
})
