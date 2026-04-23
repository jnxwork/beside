# Changelog

## 2026-04-01 (Latest)

### Guest 身份系统重构 — 全员可用

**核心变更**: 所有访客自动在 `users` 表创建 guest 记录，拥有完整 `_userId`。注册 = 升级已有 guest 行，零数据迁移。

**服务端 (server.js)**:
- **DB 迁移**: `users` 表新增 `is_guest`、`last_seen` 列
- **Guest 自动创建**: 无有效 authToken 的连接自动创建 guest 用户行（email 格式 `guest:<uuid>`），返回 authToken 给客户端存储
- **移除 `_userId` 门控**: `syncProfileToDB`、`saveFocusRecord`、留言板（发帖/删帖/点赞/获取）、周报统计、猫咪礼物统计、emoji 反应统计 —— 全部对所有用户开放
- **`_isMine` 服务端计算**: `getBulletinNotes` 返回每条 note 的 `_isMine` 标记
- **注册升级**: `/api/register` 接收 `authToken`，若属于 guest 用户则 UPDATE 升级为注册用户，历史数据自动归属
- **Guest 清理**: 每小时清理 30 天未活跃的 guest 用户（CASCADE 删除关联数据）
- **`sessionRestored` 扩展**: 新增 `authToken`（仅新 guest）、`userId`、`isRegistered` 字段

**客户端**:
- **authStore.js**: `isLoggedIn` 初始值改为 `false`；新增 `isRegistered` 状态和 `setSessionReady()` action
- **socket.js**: 处理 `sessionRestored` 中的 guest authToken 存储和 auth 状态同步；`bulletinNoteAdded` 事件自动标记 `_isMine`
- **BulletinPopup.jsx**: 移除所有 `isLoggedIn` 门控，所有用户可发帖/点赞/删帖
- **AuthPopup.jsx**: 注册请求携带当前 authToken 以支持 guest 升级
- **SettingsPanel.jsx**: 隐藏 Login/Register 按钮
- **WelcomePopup.resident-card.jsx**: 隐藏 Login/Register 按钮、Type 字段（BESIDER/WANDERER）、MRZ 区域
- **game.js**: `isRegistered` 不再从 `!!authToken` 推断；`saveFocusRecord` 移除注册门控；`sessionRestored` 处理 guest authToken 和 userId；注册 API 携带 authToken

## 2026-03-24

### Settings Panel 重构 — 游戏化菜单设计

**图标栏优化 (4 个图标)**:
- **📷 Capture 菜单**: 合并录制和截图功能，点击展开选择（Recording / Screenshot）
- **🖼️ Mini Window**: 独立按钮，直接打开 PiP 小窗
- **👤 Profile 菜单**: 点击展开 3 个选项（预览卡片 / 上周回顾 / 编辑资料）
- **⚙️ Settings 面板**: 精简为纯配置项，移除功能入口

**Settings 面板改版**:
- **分组标题**: Display / System 小标题（uppercase, 雾蓝色, 底部分割线）
- **显示名字**: 移除 label，3 个复选框横向排列，颜色匹配名牌（自己=白色, 关注=粉色, 其他=蓝色）
- **界面语言**: 从切换按钮改为下拉选择框（PixelSelect: English / 简体中文）
- **平滑字体**: 从按钮改为开关 toggle（ON=Sans 字体, OFF=Pixel 字体）
- **声音**: 保持开关 + 音量滑块组合
- **移除**: Mini 小窗和上周回顾移至其他菜单

**交互优化**:
- **菜单互斥**: 打开一个菜单自动关闭其他菜单
- **点击外部关闭**: 使用 ref 标记 + useEffect 实现可靠的点击外部关闭逻辑
- **游戏感提升**: 更宽面板（300px）、更大间距（--size-px-3）、清晰的视觉层次

**Bug 修复**:
- **PixelSelect 崩溃**: 修正用法错误（改用 `options` 数组 + `onChange` 直接接收值，而非 `<option>` 子元素 + 事件对象）
- **菜单消失问题**: 使用 `justOpened` ref 标记跳过首次点击监听，避免打开即关闭的竞态条件

**i18n**:
- zh/en 新增 `smoothFontLabel` (平滑字体 / Smooth Font)
- zh `showNamesLabel` 从 "多选" 修正为 "显示名字"
- en `showNamesLabel` 从 "Show" 修正为 "Names"

## 2026-03-24 (Earlier)

### Focus Recap 分享卡片
- **分享卡片**: History 弹窗新增分享按钮，生成 800×400 像素风格 PNG（角色精灵、本周专注时长、分类统计条），支持下载/Web Share
- **PreviewCardPopup**: 预览后再下载/复制，`__generateFocusCard(data, returnCanvas)` 支持返回 canvas 模式
- **saveBlobFile**: 提取通用的 blob 下载/分享工具函数，timelapse 录像复用

### 截图功能
- **截图按钮**: 右上角设置区新增相机按钮（录像按钮右侧），点击通过 `__onScreenshot` 导出游戏画布 PNG

### UI 字体 & 尺寸统一
- **移除全局缩放**: 去掉 `#ui-root` 的 `transform: scale(1.1667)`，按钮恢复真实 40×40px
- **字体统一**: body 基础字号 14px；Tailwind `text-xs/text-sm` 映射到 `--fs-sm`(14px)；组件 CSS 中 `--fs-xs` 引用批量替换为 `--fs-sm`
- **Icon 尺寸体系**: tokens.css 新增 `--icon-sm`(16px) / `--icon-md`(20px) / `--icon-lg`(24px)；`PixelIcon` 支持 `size="sm|md|lg"` prop，默认 24px
- **iconInner 居中修复**: `line-height: 0` + flex 居中，解决 icon 在按钮内偏下问题

### 护照页修复
- **签发日期国际化**: `issueDate` 从硬编码 `"en-GB"` 改为根据 `useLang()` 切换 `"zh-CN"` / `"en-GB"`
- **比邻者**: zh.js `rcResident` 从 "比邻" 修正为 "比邻者"

### 新增文件
- `public/icons/share.svg` — 分享图标
- `public/icons/camera.svg` — 相机图标

## 2026-03-19

### Birthday Month — 彩虹名牌边框

- **生日月字段**: 个人资料新增可选的生日月选择（1-12月），使用 `PixelSelect` 组件
- **彩虹边框渲染**: 当前月份匹配玩家生日月时，名牌显示对角渐变边框（粉→青蓝，lineWidth 3）
- **数据库**: `users` 表新增 `birth_month` 列，支持注册/登录/session 恢复
- **服务端同步**: 新增 `setBirthMonth` socket handler，`sanitizePlayer` 包含 birthMonth
- **客户端同步**: `playerUpdated` / `currentPlayers` 同步 birthMonth，localStorage 持久化
- **CJK 文字居中修复**: `drawPlayerLabel` 改用 `textBaseline: "alphabetic"` + `actualBoundingBoxAscent/Descent` 精确居中
- **名牌 X 轴对齐修复**: `gameToScreen()` 改用量化缩放因子 `gs`，与精灵渲染一致
- **i18n**: en/zh 新增 `birthMonthLabel`, `birthMonthLabelShort`, `birthMonthTip`, `birthMonthNone`, `monthJan`~`monthDec`, `rcTypeTip`

### Welcome Panel 优化

- **Resident card 设为默认**: `App.jsx` 改为默认使用 resident-card 版 WelcomePopup
- **Tooltip**: birth month 和 info 标题旁添加 CSS `?` tooltip（hover/focus 触发，支持触屏）
- **Type tooltip**: 护照页 Type 字段添加 tooltip 解释漫游者/比邻者区别
- **布局调整**: 去掉左右分割线，间距改为 48px；字段间距 12px；底部提示合并为登录/注册行
- **护照页**: 宽度 720px；照片与右侧内容 Y 轴居中；右侧两列顶头对齐；birth month 移到 name 后 type 前；label-value 间距归零
- **头像裁剪**: 护照照片调整为 28×34，从 y=18 开始截取（头部+肩膀）
- **Custom tab 边框修复**: 切换到 custom 模式时正确设置 active tab 的 `.active` class
- **代码清理**: 移除未使用的 `buildDocNo`、`divider`、`hintSep`、`hintText` 等

## 2026-03-16

### pxlkit UI 统一

- **删除废弃 shared 组件**: 移除 `src/components/shared/` 下 10 个未使用文件 (PixelButton, PixelPanel, PixelInput, PixelTextarea, Overlay 各 .jsx + .module.css)
- **ActionBar**: `<select>` → `PixelSelect`，新增 `currentStatus` 状态追踪
- **SettingsPanel**: `<input type="range">` → `PixelSlider`；3 个 login/logout/register 链接按钮 → `PixelButton variant="ghost"`
- **ChatPanel**: tab 按钮 → `PixelSegmented`；`<input type="text">` → `PixelInput`；发送按钮 → `PixelButton`；折叠按钮 → `PixelButton variant="ghost"`
- **FocusPopup**: 6 个类别按钮 → `PixelSegmented`（支持自动换行）
- **WelcomePopup**: 语言标签按钮 → `PixelButton`（选中/未选 variant 切换）；auth 链接 → `PixelButton variant="ghost"`
- **全局样式修复** (theme.css):
  - `font-mono` 覆盖为 FusionPixel（pxlkit 默认用 "Press Start 2P"）
  - `#ui-root .text-xs` 强制 14px（pxlkit sm 默认 12px，不符合 DESIGN.md 最小字号规范）
- **布局修复**: ChatPanel tabs 全宽 flex、PixelInput/PixelSlider 在 flex 容器中正确拉伸、FocusPopup PixelSegmented flex-wrap
- **清理**: 移除各 module CSS 中不再使用的原生样式 (.select, .volumeSlider, .linkBtn, .tab, .tabActive, .input, .send, .catBtn, .catBtnSelected, .langTag, .langTagSelected, .authLink)

## 2026-03-15

### Bulletin Board Improvements

- **Global focus style**: Unified `input:focus, textarea:focus, select:focus` rule (`border-color: #f5a623`), removed 5 duplicate individual `:focus` rules
- **Unlogged "Login to Post"**: Unregistered users see "Login to Post" button instead of textarea; clicking it opens the auth popup
- **Divider**: Added visual divider (`bulletin-divider`) between notes section and input area
- **Heart/Like feature** (WIP — needs debugging):
  - Server: `bulletin_likes` table, `likeBulletinNote` socket handler (toggle like, prevent self-like, broadcast update), like cleanup on note delete
  - Server: `getBulletinNotes` now returns `like_count` per note and `myLikedIds` for current user
  - Client: Clickable heart button on other users' notes, static count on own notes, `bulletinNoteLikeUpdated` socket listener
  - CSS: `.bulletin-note-like`, `.liked`, `.bulletin-note-like-count` styles
  - **Self-like restriction temporarily disabled for testing** (server.js + game.js)
