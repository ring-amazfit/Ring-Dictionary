import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { getText } from '@zos/i18n'
import { storage } from '../utils/storage'
import { THEMES, DECO } from '../utils/constants'

Page({
  state: { theme: 'dark' },

  onInit() {
    this.state.theme = storage.getTheme()
    this.state.sweepTimer = null
  },

  build() {
    var self = this
    var th = this.state.theme === 'dark' ? THEMES.dark : THEMES.light

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

    // ======== 顶部：应用名 + 版本 ========
    createWidget(widget.FILL_RECT, {
      x: px(140), y: px(36), w: px(200), h: px(3),
      radius: px(2), color: th.accent
    })

    createWidget(widget.TEXT, {
      x: px(100), y: px(46),
      w: px(280), h: px(40),
      text_size: px(30),
      color: th.accent,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('appTitle')
    })

    // 版本号药丸
    try {
      createWidget(widget.FILL_RECT, {
        x: px(200), y: px(90),
        w: px(80), h: px(18),
        radius: px(9),
        color: th.keyboardBg
      })
    } catch (e) {}
    createWidget(widget.TEXT, {
      x: px(200), y: px(90),
      w: px(80), h: px(18),
      text_size: px(12),
      color: th.textSecondary,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('version')
    })

    // ======== 开源项目二维码区 ========
    createWidget(widget.TEXT, {
      x: px(80), y: px(116),
      w: px(320), h: px(18),
      text_size: px(13),
      color: th.accent,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('openSourceScan')
    })

    // 本项目源码 Ring-Dictionary（居中放大）
    createWidget(widget.IMG, {
      x: px(140), y: px(140),
      w: px(200), h: px(200),
      src: 'github_qr_ring.png'
    })
    createWidget(widget.TEXT, {
      x: px(80), y: px(348),
      w: px(320), h: px(16),
      text_size: px(13),
      color: th.text,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('sourceCode')
    })
    createWidget(widget.TEXT, {
      x: px(80), y: px(366),
      w: px(320), h: px(14),
      text_size: px(10),
      color: th.textSecondary,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('sourceRepo')
    })

    // ======== 底部返回按钮 ========
    // 用最稳的 back() 无参调用，避免 anim 参数在某些版本导致返回无效
    createWidget(widget.BUTTON, {
      x: px(170), y: px(398),
      w: px(140), h: px(40),
      radius: px(20),
      text: getText('return'),
      text_size: px(18),
      color: th.text,
      press_color: th.border,
      normal_color: th.keyboardKey,
      click_func: function() { back() }
    })

    // 动画环 — 扫入效果
    try {
      var sweepArc = createWidget(widget.ARC, {
        x: px(DECO.sweepRing.x), y: px(DECO.sweepRing.y),
        w: px(DECO.sweepRing.w), h: px(DECO.sweepRing.h),
        start_angle: 0, end_angle: 0,
        color: th.accentSoft,
        line_width: px(DECO.sweepRing.lineWidth)
      })
      this.state.sweepTimer = setTimeout(function() {
        sweepArc.setProperty(prop.ANIM, {
          end_angle: 360,
          delay: 0,
          duration: 700,
          easing: 'ease-out'
        })
      }, 80)
    } catch (e) {}
  },

  onDestroy() {
    if (this.state.sweepTimer) {
      clearTimeout(this.state.sweepTimer)
      this.state.sweepTimer = null
    }
  }
})
