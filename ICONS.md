# Icon Reference

## PixelIcon 组件

使用 CSS `mask-image` 渲染 SVG，图标自动继承父元素的 `color`，支持 hover 变色。

```jsx
import PixelIcon from "../components/shared/PixelIcon.jsx";

<PixelIcon name="settings-cog" />           // 基本用法，大小跟随父元素 font-size
<PixelIcon name="circle" className={xxx} /> // 可附加 className 覆盖颜色/大小
```

源码: `src/components/shared/PixelIcon.jsx` + `PixelIcon.module.css`

---

## UI 控件图标 (pixelarticons)

来源: [pixelarticons](https://github.com/halfmage/pixelarticons) (MIT license, 24x24, `fill="currentColor"`)

| SVG 文件 | 替换的 emoji | 使用位置 | 组件 |
|----------|-------------|---------|------|
| `settings-cog.svg` | ⚙️ | 设置按钮 | SettingsPanel.jsx |
| `video.svg` | 📹 | 录屏按钮（未录制） | SettingsPanel.jsx |
| `square.svg` | ⏹️ | 录屏按钮（录制中/停止） | SettingsPanel.jsx |
| `chart.svg` | 📊 | 专注历史按钮 | ActionBar.jsx |
| `clipboard-note.svg` | 📋 | 公告板按钮 | ActionBar.jsx |
| `circle.svg` | 🟢 | 在线人数指示点 | InfoPanel.jsx |
| `book-open.svg` | 📖 | Focus 房间标签 | InfoPanel.jsx |
| `coffee.svg` | ☕ | Lounge 房间标签 | InfoPanel.jsx |
| `cancel.svg` | × | 删除按钮 | BulletinPopup.jsx, HistoryPopup.jsx |
| `share.svg` | — | 分享卡片按钮 | HistoryPopup.jsx |

---

## 品牌 / 装饰图标 (自制)

| SVG 文件 | 用途 |
|----------|------|
| `icon.svg` | App icon |
| `favicon.svg` | 浏览器 favicon |
| `logo.svg` | Logo |
| `logo-a.svg` | Logo 变体 A |
| `logo-b.svg` | Logo 变体 B |
| `logo-c.svg` | Logo 变体 C |
| `heart_filled.svg` | 实心爱心（未使用，bulletin 用 Unicode ♥/♡） |
| `heart_outline.svg` | 空心爱心（未使用，bulletin 用 Unicode ♥/♡） |

---

## 未替换的 emoji（保持原样）

| Emoji | 原因 |
|-------|------|
| 📖💼☕💬🎵 等状态 emoji | 玩家头顶状态，属游戏内容非 UI 控件 |
| 👋💪❤️⭐ 等反应 emoji | 反应表情，属游戏内容非 UI 控件 |
| 🎲 | 无合适 pixel 替代 |
| 🌐 | 嵌在 i18n 字符串里 |
| ⬆⬇ / ↑↓←→ | 嵌在 i18n 字符串或键盘提示中 |
| ♥ / ♡ | Bulletin 点赞，已是像素风 Unicode，保持一致 |
