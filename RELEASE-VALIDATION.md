# Ring-Dictionary 发布前验证记录

## 当前版本

- APPID：`1121555`
- 版本：`2.2.0`（code `7`）
- 目标：3 个 Balance + 2 个 Cheetah Pro + 8 个 Active 2（圆形版）+ 3 个 GTR4 / GTR4 LE + 3 个 T-Rex 3，共 19 个圆屏目标
- 本地隐私声明：[`PRIVACY.md`](./PRIVACY.md)

## v2.2.0 变更

- 关于页重构：新增爱发电赞赏二维码（`ifdian_qr_ring.png`），修复返回按钮缺导入导致的无法返回。
- 修复部分词条搜到但详情无释义（引擎 `isPast`/精确匹配 `| 32` 污染非字母、扫描上限过小、单词缓冲 64 字符截断）。
- 修复未找到词相关崩溃：历史页缺失 `bindCrown` 导入，打开历史页即死机。
- 新增搜索结果「更多 →」继续加载更多词族。
- 拼音候选表冠翻页节流放宽至 350ms，避免一旋多翻。
- 拼音字库精简：8104 → 4151 字，删除词库 0 频生僻字并常用前置。

## 已完成的本地验证

在 `D:\ring\ring-dictionary-v2` 执行：

```text
node --check app.js page/*.js utils/*.js setting/*.js tools/*.mjs
node tools/verify-search.mjs
node tools/test-publish-features.mjs
node tools/test-results-preview-style.mjs
node tools/test-release-consistency.mjs
node tools/test-i18n-keys.mjs
node tools/test-gaokao-i18n.mjs
node --loader ./tools/loader.mjs tools/test-word-family-search.mjs
node --loader ./tools/loader.mjs tools/test-cn-read-budget.mjs
node --loader ./tools/loader.mjs tools/test-detail-navigation-regression.mjs
node --loader ./tools/loader.mjs tools/test-searchmore-and-definitions.mjs
npx zeus build
npx zeus prune --ip
```

结果：源码语法/JSON、真实词库（含全量 lookupDefinition 命中与 searchMore）、表冠结构、中文读取预算、结果页展开、日期边界、双语 PO key、ZAB 构建均已通过。

## 最新构建包

- 文件：`dist/1121555-环间小词典-2.2.0-20260809095934.zab`
- SHA-256：`9719a290e22cd1a74a5b8dd37dd10cfa2dcdbed4defc6eb10c455650d768b6be`
- 外层 manifest：4 个 ZPK，包含 19 个目标 `deviceSource`
  - GTR4：3 个目标
  - Cheetah Pro + Balance：5 个目标
  - T-Rex 3：3 个目标
  - Active 2（圆形版）：8 个目标
- 已验证目标 `deviceSource`：
  - Balance：`8519936`、`8519937`、`8519939`
  - Cheetah Pro：`8126720`、`8126721`
  - Active 2（圆形版）：`8913152`、`8913153`、`8913155`、`8913159`、`10092800`、`10092801`、`10092803`、`10092807`
  - GTR4：`7864577`、`7930112`、`7930113`
  - T-Rex 3：`8716544`、`8716545`、`8716547`
- 配置不包含 `app-side`；仅保留手机端 `setting` 说明页。

## 重要说明

Zepp 官方图标要求分两类：

- 工程/系统图标：最终资源为 `248×248`，主体内容为 `240×240`，四周保留 `4px` 透明安全区；Zeus 构建会在源图标小于 248px 时给出警告。
- 市场 Console 上传图标：独立使用 `240×240 PNG`，圆形主体、外围透明。

因此当前 `assets/common/icon.png` 是市场上传图标版本（240×240 RGBA PNG）。本次构建的 ZAB 已成功生成，但 Zeus 对工程源图标发出“minimum width and height needs to be 248”的 warning；若要消除该 warning，应另行准备 248×248 工程源图标（主体 240、四周 4px 透明），同时在 Zepp Console 使用当前 240×240 市场图标。不要把两种规格混为一谈。

## 仍需人工完成

- 在 Balance、GTR4 和 T-Rex 3 真机分别检查启动、英文/中文搜索、结果页释义展开、详情触控上下段、详情返回、历史/收藏、表冠（有则验证）、设置和高考提示。
- 在 Zepp Console 上传最新 ZAB，核对 APPID、版本、19 个圆形屏目标、权限、隐私声明、市场 240×240 图标、截图、分类和开发者信息。
- 确认 Console 的 Calling Permissions 与 `app.json` 一致：`device:os.local_storage`、`data:os.device.info`、`device:os.file`。
