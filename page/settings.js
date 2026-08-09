import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { back, replace } from '@zos/router'
import { getText } from '@zos/i18n'
import { storage } from '../utils/storage'
import { THEMES, DECO } from '../utils/constants'

Page({
  state: {
    settings: {},
    theme: 'dark'
  },

  onInit() {
    this.state.settings = storage.getSettings()
    this.state.theme = storage.getTheme()
    this.state.settings.gaokaoCountdown = this.state.settings.gaokaoCountdown === true
    this.state.settings.gaokaoLastNoticeDate = this.state.settings.gaokaoLastNoticeDate || ''
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

    // 页面标题 + 装饰线
    createWidget(widget.FILL_RECT, {
      x: px(100), y: px(44), w: px(40), h: px(3),
      radius: px(2), color: th.accent
    })
    createWidget(widget.TEXT, {
      x: px(100), y: px(48), w: px(280), h: px(32),
      text_size: px(24),
      color: th.text,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: getText('settingsTitle')
    })

    // 设置行
    this._renderRow(px(100), getText('theme'), this.state.theme === 'dark' ? getText('darkTheme') : getText('lightTheme'),
      th.accent, function() { self._toggleTheme() })
    this._renderRow(px(168), getText('autoComplete'), this.state.settings.autoComplete ? getText('enabled') : getText('disabled'),
      this.state.settings.autoComplete ? th.success : th.accent, function() { self._toggleAutoComplete() })
    this._renderRow(px(236), getText('gaokaoCountdown'), this.state.settings.gaokaoCountdown ? getText('enabled') : getText('disabled'),
      this.state.settings.gaokaoCountdown ? th.success : th.accent, function() { self._toggleGaokao() })
    this._renderRow(px(304), getText('debugInfo'), this.state.settings.debugInfo ? getText('enabled') : getText('disabled'),
      this.state.settings.debugInfo ? th.success : th.accent, function() { self._toggleDebugInfo() })

    // 说明文字
    createWidget(widget.TEXT, {
      x: px(70), y: px(364),
      w: px(340), h: px(36),
      text_size: px(14),
      color: th.textSecondary,
      align_h: align.LEFT,
      align_v: align.TOP,
      text_style: text_style.WRAP,
      text: getText('settingsNote') + '\n' + getText('fullKeyboardNote') + '\n' + getText('gaokaoNote')
    })

    // 返回按钮
    createWidget(widget.BUTTON, {
      x: px(170), y: px(418),
      w: px(140), h: px(40),
      radius: px(20),
      text: getText('back'),
      text_size: px(17),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { back() }
    })
  },

  _renderRow(y, title, value, valueColor, handler) {
    var th = this.theme

    // 行背景
    createWidget(widget.FILL_RECT, {
      x: px(60), y: y, w: px(360), h: px(52),
      radius: px(18), color: th.keyboardBg
    })

    // 标题
    createWidget(widget.TEXT, {
      x: px(78), y: y + px(12), w: px(180), h: px(28),
      text_size: px(20),
      color: th.text,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: title
    })

    // 值按钮
    createWidget(widget.BUTTON, {
      x: px(262), y: y + px(8), w: px(144), h: px(36),
      radius: px(18),
      text: value,
      text_size: px(15),
      color: 0xffffff,
      press_color: th.border,
      normal_color: valueColor,
      click_func: handler
    })
  },

  _toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark'
    this.state.settings.theme = this.state.theme
    storage.setTheme(this.state.theme)
    storage.saveSettings(this.state.settings)
    replace({ url: 'page/settings', anim: true })
  },

  _toggleGaokao() {
    this.state.settings.gaokaoCountdown = !this.state.settings.gaokaoCountdown
    if (!this.state.settings.gaokaoCountdown) this.state.settings.gaokaoLastNoticeDate = ''
    storage.saveSettings(this.state.settings)
    replace({ url: 'page/settings', anim: false })
  },

  _toggleDebugInfo() {
    this.state.settings.debugInfo = !this.state.settings.debugInfo
    storage.saveSettings(this.state.settings)
    replace({ url: 'page/settings', anim: false })
  },

  _toggleAutoComplete() {
    this.state.settings.autoComplete = !this.state.settings.autoComplete
    storage.saveSettings(this.state.settings)
    replace({ url: 'page/settings', anim: false })
  },

  onDestroy() {}
})
