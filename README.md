<p align="center">
  <img src="./assets/common/icon.png" width="112" alt="环间小词典图标">
</p>

<h1 align="center">环间小词典</h1>

<p align="center">运行在 Amazfit Zepp OS 圆形屏手表上的离线中英词典，支持 QWERTY 输入、中文拼音、快速搜索、历史记录与收藏。</p>

<p align="center">
  <a href="#功能概览">功能</a> ·
  <a href="#界面预览">预览</a> ·
  <a href="#支持设备">设备</a> ·
  <a href="#开发与构建">开发</a> ·
  <a href="./PRIVACY.md">隐私声明</a> ·
  <a href="./README.en.md">English</a>
</p>

> [!NOTE]
> 当前版本：`v2.2.0` · App ID：`1121555` · version code：`7` · 适用于 Zepp OS 3.0 及以上运行环境。

## 功能概览

### 中英文查询

- 支持英文精确查询、前缀匹配和有限模糊匹配。
- 支持中文释义查询，例如输入「你」可匹配 `your`、`hello` 等词条。
- 词库完全离线处理，不需要账号、网络、广告或云端接口。
- 结果页提供释义预览；缺失释义只在打开详情或点击展开时补查，避免搜索过程卡顿。
- 结果页使用分页与受控缓存，避免整本预加载词库、超量同步读取和内存峰值。

### QWERTY 与拼音输入

- 使用固定 QWERTY 键盘，适合圆形屏幕输入英文和拼音。
- 中文模式提供候选字、候选翻页、删除和清空。
- 英文模式提供光标左移、右移、退格和快速搜索。
- T-Rex 3 等无表冠设备可完全使用页面触控按钮完成候选翻页和结果操作。

### 详情、历史与收藏

- 详情页显示单词、释义、收藏状态和相关词。
- 长释义提供 `↑ 上段` / `↓ 下段` 触控按钮；Balance/GTR4 也可使用表冠快捷滚动。
- 搜索结果、历史记录和收藏列表均支持触控翻页。
- 详情返回会恢复原结果页，不依赖页面脚本之间共享 JavaScript 全局变量。

### 高考倒计时与本地设置

- 可在手表设置页开启高考倒计时。
- 首页每天首次进入时显示一次 Toast。
- 详情页显示当前倒计时。
- 支持深色/浅色主题、自动补全和调试信息开关。
- 手机端仅提供设置说明，不显示无法同步到手表的伪开关。

## 界面预览

以下图片同时符合 Zepp OS Console 应用介绍截图要求：`360×360`、PNG 格式。

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/images/home.png" alt="主页与中文拼音输入" width="100%"><br>
      <sub><b>主页</b><br>英文/中文模式、拼音候选与 QWERTY 键盘</sub>
    </td>
    <td width="50%" align="center">
      <img src="./docs/images/results-cn.png" alt="中文搜索结果页" width="100%"><br>
      <sub><b>中文结果页</b><br>中文释义搜索、释义预览与分页导航</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/images/detail.png" alt="单词详情页" width="100%"><br>
      <sub><b>详情页</b><br>释义卡、收藏、返回与查词典</sub>
    </td>
    <td width="50%" align="center">
      <img src="./docs/images/results-en.png" alt="英文搜索结果页" width="100%"><br>
      <sub><b>英文结果页</b><br>英文查询、释义预览与分页导航</sub>
    </td>
  </tr>
</table>

## 支持设备

`app.json` 当前声明支持以下圆形屏 Amazfit 设备：

| 系列 | 设备目标 | 分辨率目标 | 操作方式 |
| --- | ---: | ---: | --- |
| Amazfit Balance | 3 个 | 480 × 480 | 表冠 / 触控 |
| Amazfit Cheetah Pro | 2 个 | 480 × 480 | 触控 |
| Amazfit Active 2（圆形版） | 8 个 | 466 × 466 | 表冠 / 触控 |
| Amazfit GTR 4 / GTR 4 LE | 3 个 | 466 × 466 | 表冠 / 触控 |
| Amazfit T-Rex 3 | 3 个 | 480 × 480 | 触控 |

> [!TIP]
> 表冠仅是 Balance、Active 2（圆形版）和 GTR4 的快捷操作，不是功能依赖。Cheetah Pro 和 T-Rex 3 没有表冠时，候选、结果、历史、收藏和详情释义均可通过屏幕触控完成。
>
> [!NOTE]
> 当前版本只声明圆形屏目标。方屏 Amazfit Active、Amazfit Active 2（方形版）以及 360 × 360 的 Active Edge 需要独立布局适配，未包含在本次发布范围内。

## 使用说明

### 查询英文单词

1. 打开应用进入主页。
2. 在 QWERTY 键盘点击字母。
3. 点击「→ 搜索」或上方「查」按钮。
4. 在结果页点击「打开详情」查看完整释义。

### 查询中文释义

1. 点击主页右上角切换到「中文」模式。
2. 使用 QWERTY 键盘输入拼音。
3. 点击候选字下方的编号选择汉字。
4. 候选较多时点击左右触控按钮翻页；有表冠的设备也可旋转表冠翻页。
5. 输入完成后点击搜索。

### 查看、返回和收藏

1. 结果页点击「打开详情」。
2. 详情页点击「♡ 收藏」保存单词。
3. 点击「← 返回」回到原结果页。
4. 从主页底部可进入历史、收藏、设置、关于和随机查询。

## 隐私与数据

- 搜索词、历史记录、收藏和设置默认只保存在手表本地。
- 词典查询在设备本地完成，不上传搜索内容。
- 应用不要求账号，不接入广告、统计、定位、通讯录、麦克风、相册或支付服务。
- 完整声明见 [`PRIVACY.md`](./PRIVACY.md)。上架时还需要将其中内容填写到 Zepp 开发者中心的隐私声明字段。

## 开发与构建

### 前置条件

- Node.js（建议使用当前维护中的 LTS 版本）
- Zepp OS 开发环境
- 可访问的 npm 镜像

### 安装依赖

```bash
npm ci
```

### 构建安装包

```bash
npm run build
```

或直接运行：

```bash
npx zeus build
npx zeus prune --ip
```

构建产物会生成在 `dist/` 目录。`.zab` 文件可用于 Zepp App、开发者模式或兼容的第三方安装工具。

### 预览

```bash
npm run preview
```

也可以按 Zeus CLI 的设备名称选择目标预览。

## 项目结构

```text
app.js                    # 手表端入口与物理按键返回处理
app.json                  # APPID、权限、页面、设备目标与 i18n
page/home.js              # 主页、QWERTY、拼音输入与搜索
page/results.js           # 结果页、分页、释义展开与结果路由
page/detail.js            # 详情、释义滚动、收藏与返回
page/history.js           # 历史记录与分页
page/favorites.js         # 收藏列表与分页
page/settings.js          # 手表端设置
page/about.js             # 关于页与开源二维码
setting/index.js          # Zepp App 设置说明页
utils/dict-engine.js      # 窗口读取、索引搜索与中文倒排查询
utils/route-cache.js      # 跨页面临时结果缓存
utils/crown.js            # 表冠统一适配
utils/storage.js          # 手表本地存储
utils/pinyin.js           # 拼音候选字典
page/i18n/                # 手表端中英文 PO 资源
setting/i18n/             # 手机设置页中英文 PO 资源
assets/common/dic/        # 主词库、补充词库与索引
assets/common/icon.png    # 240×240 RGBA 市场图标
assets/common/github_qr_ring.png # GitHub 二维码
assets/common/help.png    # 帮助图片
docs/images/             # 360×360 Console/README 截图
```

## 验证

```bash
node tools/verify-search.mjs
node tools/test-publish-features.mjs
node tools/test-results-preview-style.mjs
node tools/test-i18n-keys.mjs
node tools/test-release-consistency.mjs
node --loader ./tools/loader.mjs tools/test-detail-navigation-regression.mjs
node --loader ./tools/loader.mjs tools/test-word-family-search.mjs
node --loader ./tools/loader.mjs tools/test-cn-read-budget.mjs
npx zeus build
npx zeus prune --ip
```

最新构建信息见 [`RELEASE-VALIDATION.md`](./RELEASE-VALIDATION.md)。

## 开源协议

本项目采用 [MIT License](./LICENSE) 开源。你可以在保留版权与许可声明的前提下使用、修改、分发或商用本项目。
