import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { back, replace } from '@zos/router'
import { getText } from '@zos/i18n'
import { getGaokaoCountdownText } from '../utils/gaokao'
import dictEngine from '../utils/dict-engine'
import { storage } from '../utils/storage'
import { THEMES, CROWN, DECO } from '../utils/constants'
import { bindCrown } from '../utils/crown'

function parseParams(params) {
  if (!params) return {}
  var p = params
  if (typeof p === 'string') {
    try { p = JSON.parse(p) } catch (e) { p = {} }
  }
  return p || {}
}

function isMissingDefinition(text) {
  return !text || text === '未找到释义' || text === getText('notFoundDefinition')
}

function trimDefinition(text) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

var DEF_VISIBLE = 180
var DEF_STEP = 40

// 表冠按官方规范由 bindCrown 统一处理：KEY_HOME、有效 degree、Math.sign、轻节流。

Page({
  state: {
    word: '',
    definition: '',
    fullDef: '',
    phonetic: '',
    suggestions: [],
    defScroll: 0,
    defMax: 0
  },

  onInit(params) {
    var p = parseParams(params)
    this.state.word = p.word || ''
    this.state.gaokaoText = storage.getSettings().gaokaoCountdown ? getGaokaoCountdownText(undefined, getText) : ''
    this.state.definition = p.definition || ''
    this.state.fullDef = p.definition || ''
    if (isMissingDefinition(this.state.definition) && this.state.word) {
      // 结果卡片、历史和收藏可能只传入空值/旧版中文占位文本；详情页必须按单词补查精确释义。
      var found = dictEngine.lookupDefinition(this.state.word)
      if (found && !isMissingDefinition(found.definition)) {
        this.state.definition = found.definition
        this.state.fullDef = found.definition
      }
    }
    if (isMissingDefinition(this.state.definition)) {
      this.state.definition = getText('notFoundDefinition')
      this.state.fullDef = this.state.definition
    }
    this.state.phonetic = p.phonetic || ''
    if (!this.state.suggestions.length) this.state.suggestions = p.suggestions || []
    this.state.resultToken = p.resultToken || ''
  },

  build() {
    var self = this
    var th = storage.getTheme() === 'dark' ? THEMES.dark : THEMES.light
    var w = this.state.word
    var full = trimDefinition(this.state.fullDef)
    this.state.fullDef = full
    this.state.defMax = Math.max(0, full.length - DEF_VISIBLE)
    this.state.defScroll = 0

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: px(480), h: px(480), radius: px(240), color: th.bg })
    createWidget(widget.ARC, {
      x: px(DECO.outerRing.x), y: px(DECO.outerRing.y),
      w: px(DECO.outerRing.w), h: px(DECO.outerRing.h),
      start_angle: 0, end_angle: 360, color: th.border,
      line_width: px(DECO.outerRing.lineWidth)
    })

    createWidget(widget.TEXT, {
      x: px(100), y: px(44), w: px(280), h: px(32), text_size: px(26),
      color: th.text, align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE, text: w || '...'
    })
    if (this.state.phonetic) {
      createWidget(widget.TEXT, {
        x: px(80), y: px(78), w: px(320), h: px(20), text_size: px(15),
        color: th.textSecondary, align_h: align.CENTER_H, align_v: align.CENTER_V,
        text: '/' + this.state.phonetic + '/'
      })
    }

    var sepY = this.state.phonetic ? px(106) : px(84)
    createWidget(widget.FILL_RECT, { x: px(130), y: sepY, w: px(220), h: px(1), color: th.border })
    var defY = sepY + px(12)
    var defH = px(218)
    createWidget(widget.FILL_RECT, {
      x: px(60), y: defY, w: px(360), h: px(210), radius: px(18), color: th.panel
    })
    createWidget(widget.FILL_RECT, {
      x: px(60), y: defY + px(10), w: px(3), h: px(190), radius: px(2), color: th.accent
    })
    this.defText = createWidget(widget.TEXT, {
      x: px(this.state.defMax > 0 ? 112 : 78),
      y: defY + px(8),
      w: px(this.state.defMax > 0 ? 256 : 330),
      h: defH, text_size: px(18),
      color: th.text, align_h: align.CENTER_H, align_v: align.TOP,
      text_style: text_style.WRAP, text: this._defSlice()
    })
    if (this.state.defMax > 0) {
      // 释义滚动不能只依赖表冠：T-Rex 3 等无表冠设备使用两侧触控按钮。
      this.prevDefBtn = createWidget(widget.BUTTON, {
        x: px(64), y: defY + px(92), w: px(50), h: px(36), radius: px(18),
        text: getText('definitionPrev'), text_size: px(13), color: th.text,
        press_color: th.border, normal_color: th.keyboardKey,
        click_func: function() { self._changeDefinitionScroll(-1) }
      })
      this.nextDefBtn = createWidget(widget.BUTTON, {
        x: px(366), y: defY + px(92), w: px(50), h: px(36), radius: px(18),
        text: getText('definitionNext'), text_size: px(13), color: th.text,
        press_color: th.border, normal_color: th.keyboardKey,
        click_func: function() { self._changeDefinitionScroll(1) }
      })
    }
    try {
      if (this.defText.setProperty) this.defText.setProperty(prop.ANIM, {
        y: defY, delay: 0, duration: 220, easing: 'ease-out'
      })
    } catch (e) {}

    this.scrollHint = createWidget(widget.TEXT, {
      x: px(60), y: defY + defH - px(16), w: px(360), h: px(14), text_size: px(10),
      color: th.textSecondary, align_h: align.CENTER_H, align_v: align.CENTER_V,
      text: this.state.defMax > 0 ? this._scrollLabel() : ''
    })
    if (this.state.gaokaoText) {
      createWidget(widget.TEXT, {
        x: px(90), y: px(352), w: px(300), h: px(18), text_size: px(12), color: th.accent,
        align_h: align.CENTER_H, align_v: align.CENTER_V, text: this.state.gaokaoText
      })
    }

    var btnY = px(370)
    var btnH = px(38)
    var btnW = px(112)
    var btnGap = px(12)
    var btnStartX = px(60)
    this.favoriteBtn = createWidget(widget.BUTTON, {
      x: btnStartX, y: btnY, w: btnW, h: btnH, radius: px(16),
      text: storage.isFavorite(w) ? getText('favorited') : getText('favorite'), text_size: px(13),
      color: 0xffffff, press_color: th.success,
      normal_color: storage.isFavorite(w) ? th.danger : th.accent,
      click_func: function() { self._toggleFavorite(w, full) }
    })
    createWidget(widget.BUTTON, {
      x: btnStartX + btnW + btnGap, y: btnY, w: btnW, h: btnH, radius: px(16),
      text: getText('back'), text_size: px(13), color: th.text,
      press_color: th.border, normal_color: th.keyboardKey,
      click_func: function() { back() }
    })
    createWidget(widget.BUTTON, {
      x: btnStartX + (btnW + btnGap) * 2, y: btnY, w: btnW, h: btnH, radius: px(16),
      text: getText('searchDictionary'), text_size: px(13), color: 0xffffff,
      press_color: th.success, normal_color: th.accent,
      click_func: function() { replace({ url: 'page/home', anim: true }) }
    })

    var maxS = self.state.suggestions && self.state.suggestions.length > 0
      ? Math.min(3, self.state.suggestions.length) : 0
    if (maxS > 0) {
      createWidget(widget.TEXT, {
        x: px(60), y: px(322), w: px(200), h: px(18), text_size: px(13),
        color: th.textSecondary, align_h: align.LEFT, align_v: align.CENTER_V,
        text: getText('relatedWords')
      })
      for (var i = 0; i < maxS; i++) {
        var sx = px(250) + i * px(72)
        createWidget(widget.BUTTON, {
          x: sx, y: px(316), w: px(64), h: px(32), radius: px(16),
          text: self.state.suggestions[i].word, text_size: px(13), color: 0xffffff,
          press_color: th.border, normal_color: th.accentSoft,
          click_func: (function(sugg) {
            return function() {
              var next = sugg.definition
                ? { word: sugg.word, definition: sugg.definition, suggestions: [] }
                : dictEngine.lookup(sugg.word)
              storage.addHistory(sugg.word)
              replace({
                url: 'page/detail',
                params: JSON.stringify({
                  word: sugg.word,
                  definition: next && next.definition ? next.definition : getText('notFoundDefinition'),
                  suggestions: next && next.suggestions ? next.suggestions : [],
                  phonetic: '', resultToken: self.state.resultToken
                }),
                anim: true
              })
            }
          })(self.state.suggestions[i])
        })
      }
    }

    this._unbindCrown = bindCrown(function(step) {
      self._changeDefinitionScroll(step)
    })
  },

  _changeDefinitionScroll(step) {
    if (this.state.defMax <= 0) return
    var next = this.state.defScroll + step * DEF_STEP
    if (next < 0) next = 0
    if (next > this.state.defMax) next = this.state.defMax
    if (next !== this.state.defScroll) {
      this.state.defScroll = next
      this.defText.setProperty(prop.MORE, { text: this._defSlice() })
      this._updateScrollHint()
    }
  },

  _defSlice() {
    var d = this.state.fullDef || ''
    if (d.length <= DEF_VISIBLE) return d
    return d.slice(this.state.defScroll, this.state.defScroll + DEF_VISIBLE)
  },

  _scrollLabel() {
    var total = Math.max(1, Math.ceil((this.state.defMax + DEF_VISIBLE) / DEF_VISIBLE))
    var current = Math.min(total, Math.floor(this.state.defScroll / DEF_VISIBLE) + 1)
    return getText('segmentPrefix') + current + '/' + total + getText('segmentSuffix')
  },

  _updateScrollHint() {
    if (this.scrollHint) this.scrollHint.setProperty(prop.MORE, { text: this._scrollLabel() })
  },

  _toggleFavorite(word, definition) {
    if (storage.isFavorite(word)) {
      storage.removeFavorite(word)
      this.favoriteBtn.setProperty(prop.MORE, {
        text: getText('favorite'),
        normal_color: (storage.getTheme() === 'dark' ? THEMES.dark : THEMES.light).accent
      })
    } else {
      storage.addFavorite(word, definition)
      this.favoriteBtn.setProperty(prop.MORE, {
        text: getText('favorited'),
        normal_color: (storage.getTheme() === 'dark' ? THEMES.dark : THEMES.light).danger
      })
    }
  },

  onDestroy() {
    if (this._unbindCrown) this._unbindCrown()
  }
})
