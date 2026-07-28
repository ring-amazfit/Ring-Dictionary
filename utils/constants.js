export const THEMES = {
  dark: {
    bg: 0x000000,
    panel: 0x0d0d16,
    text: 0xf0f0f4,
    textSecondary: 0x78788c,
    accent: 0x5c8cff,
    accentSoft: 0x10102a,
    success: 0x4cd964,
    danger: 0xff4d4d,
    keyboardBg: 0x141420,
    keyboardKey: 0x1e1e2e,
    border: 0x222238
  },
  light: {
    bg: 0xf0f2f8,
    panel: 0xffffff,
    text: 0x1c1c28,
    textSecondary: 0x6b6b82,
    accent: 0x4a7cff,
    accentSoft: 0xe2eaff,
    success: 0x34c759,
    danger: 0xff3b30,
    keyboardBg: 0xe2e4ee,
    keyboardKey: 0xf4f6fa,
    border: 0xccd0de
  }
}

export const SCREEN = {
  width: 480,
  height: 480,
  safeMargin: 38,
  centerX: 240,
  centerY: 240,
  radius: 240,
  RESULTS_PER_PAGE: 4,
  HISTORY_PER_PAGE: 7,
  FAVORITES_PER_PAGE: 5,
  CANDIDATES_PER_PAGE: 3
}

/**
 * 480x480 圆屏安全区域计算
 * 圆屏可视区域为内接圆，四角会被切掉
 * 在顶部/底部边缘，可用水平宽度急剧缩小
 *
 * 安全区域约定（基于圆方程验证）：
 * - 顶部标题区 (y < 80): 内容最大宽 280px，必须居中
 * - 中部内容区 (y 80~380): 边距 60px，最大宽 360px
 * - 底部按钮区 (y > 390): 按钮必须居中，总宽不超过 276px
 */
export const SAFE = {
  top: { maxW: 280, x: 100 },
  mid: { margin: 60, x: 60, w: 360 },
  bottom: { y: 400, h: 32, maxTotalW: 276, startX: 102 }
}

/**
 * 装饰性元素常量
 */
export const DECO = {
  // 外圈细环（近屏幕边缘）
  outerRing: { x: 12, y: 12, w: 456, h: 456, lineWidth: 1 },
  // 内圈点缀环（接近内容区边界）
  innerRing: { x: 30, y: 30, w: 420, h: 420, lineWidth: 1 },
  // 动画环（用于页面加载时的扫入动画）
  sweepRing: { x: 16, y: 16, w: 448, h: 448, lineWidth: 2 }
}

/**
 * 表冠配置（按 Zepp OS 官方 onDigitalCrown 规范）
 *
 * 官方规范：onDigitalCrown 的 callback(key, degree) 中 degree 即为本次事件的
 * 旋转量，所有设备一致，无需按 deviceSource 做阈值/反向纠偏。
 *
 * 策略：用 degree 的正负判断方向（上滚/下滚），用一个小阈值过滤手抖噪声。
 * 旧代码用 crownAccum 累加 + deviceSource 查 sensitive/reverse 表是 hack，
 * 会在 GTR4 等设备上把正常旋转直接吞掉，导致表冠"完全无反应"。
 *
 * 回调里必须先做 key===KEY_HOME 过滤 + typeof degree !== 'number' 防御
 * （见各页 crownStep 函数），否则表冠按下事件 degree===0/undefined 会让
 * Math.abs(degree) 返回 NaN 继而误触发翻页。详见 Memory
 * zeppos-digital-crown-gtr4.md。
 */
export const CROWN = {
  // 单次事件 |degree| 低于此值视为噪声忽略（官方 degree 单次一般 ≥10）
  noiseThreshold: 3
}
