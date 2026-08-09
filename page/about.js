import { createWidget, widget, text_style, align, prop } from '@zos/ui'
import { px } from '@zos/utils'
import { back } from '@zos/router'
import { getText } from '@zos/i18n'
import { storage } from '../utils/storage'
import { THEMES, DECO } from '../utils/constants'

// 关于页：顶部应用名+版本；中部双卡片（本项目源码 + 爱发电赞赏）；底部返回按钮。
// 返回必须导入 @zos/router 的 back（此前缺导入导致按钮点击报错、无法返回）。

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
      x: px(140), y: px(32), w: px(200), h: px(3),
      radius: px(2), color: th.accent
    })

    createWidget(widget.TEXT, {
      x: px(100), y: px(42),
      w: px(280), h: px(38),
      text_size: px(30),
      color: th.accent,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('appTitle')
    })

    // 版本号药丸
    try {
      createWidget(widget.FILL_RECT, {
        x: px(196), y: px(88),
        w: px(88), h: px(20),
        radius: px(10),
        color: th.keyboardBg
      })
    } catch (e) {}
    createWidget(widget.TEXT, {
      x: px(196), y: px(88),
      w: px(88), h: px(20),
      text_size: px(12),
      color: th.textSecondary,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('version')
    })

    // ======== 双二维码卡片 ========
    // 卡片1：本项目源码（左）
    createWidget(widget.FILL_RECT, {
      x: px(56), y: px(120), w: px(180), h: px(236),
      radius: px(20), color: th.keyboardBg
    })
    createWidget(widget.FILL_RECT, {
      x: px(56), y: px(120), w: px(180), h: px(236),
      radius: px(20), color: th.panel
    })
    createWidget(widget.IMG, {
      x: px(61), y: px(128),
      w: px(170), h: px(170),
      src: 'github_qr_ring.png'
    })
    createWidget(widget.TEXT, {
      x: px(56), y: px(304),
      w: px(180), h: px(18),
      text_size: px(13),
      color: th.accent,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('sourceCode')
    })
    createWidget(widget.TEXT, {
      x: px(56), y: px(324),
      w: px(180), h: px(14),
      text_size: px(10),
      color: th.textSecondary,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE,
      text: getText('sourceRepo')
    })

    // 卡片2：爱发电赞赏（右）
    createWidget(widget.FILL_RECT, {
      x: px(244), y: px(120), w: px(180), h: px(236),
      radius: px(20), color: th.keyboardBg
    })
    createWidget(widget.FILL_RECT, {
      x: px(244), y: px(120), w: px(180), h: px(236),
      radius: px(20), color: th.panel
    })
    createWidget(widget.IMG, {
      x: px(249), y: px(128),
      w: px(170), h: px(170),
      src: 'ifdian_qr_ring.png'
    })
    createWidget(widget.TEXT, {
      x: px(244), y: px(304),
      w: px(180), h: px(18),
      text_size: px(13),
      color: th.accent,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: getText('supportTitle')
    })
    createWidget(widget.TEXT, {
      x: px(244), y: px(324),
      w: px(180), h: px(14),
      text_size: px(10),
      color: th.textSecondary,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.TRUNCATE,
      text: getText('supportRepo')
    })

    // ======== 底部返回按钮 ========
    createWidget(widget.BUTTON, {
      x: px(160), y: px(396),
      w: px(160), h: px(44),
      radius: px(22),
      text: getText('return'),
      text_size: px(19),
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
