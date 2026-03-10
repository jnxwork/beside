# Beside 设计规范

所有 UI 数值、视觉参数、系统配置的完整参考。代码修改时以此为准。

---

## 1. 设计系统基础

### 间距规则
- 所有 padding / margin / gap 必须是 **4 或 8 的倍数**
- 常用值: 4, 8, 12, 16, 20, 24, 32, 40, 48

### 字号规则
- 最小字号 **14px**，无例外
- 游戏内文字(Canvas)不受此限制，但标签文字应清晰可读

### 配色体系

| 用途 | 值 |
|------|------|
| 页面背景 | `#2a2838` |
| 面板背景 | `rgba(22,33,62,0.94)` |
| 面板边框 | 无（不加 border） |
| 边框色(分割线等) | `#0f3460` |
| 强调色 | `#f5a623` |
| 玩家名(卡片) | `#4DA6FF` |
| 专注标签色 | `#f5a623` |

### CSS 变量

```css
--ui-icon-frame-size: 40px;
--ui-icon-inner-size: 24px;
--ui-icon-radius: 10px;
--ui-emoji-min-size: 24px;
--ui-online-emoji-size: 20px;
```

### 字体栈
```
'MiSans', 'PingFang SC', 'Microsoft YaHei', sans-serif
```

### 像素风渲染
Canvas 使用 `imageSmoothingEnabled = false`，保持像素锐利。

---

## 2. 画布与渲染

### 基本尺寸

| 参数 | 值 | 来源 |
|------|------|------|
| TILE | 32px | game.js |
| Focus 房间 | 由 Tiled JSON 定义 | focus.json |
| Rest 房间 | 由 Tiled JSON 定义 | rest.json |
| 最小缩放(移动端) | 1.2 | `MIN_SCALE_MOBILE` |

### 碰撞地图 Tile 类型

| 值 | 类型 | 玩家可走 | 猫可走 |
|----|------|----------|--------|
| 0 | 地板 | Yes | Yes |
| 1 | 墙壁 | No | No |
| 2 | 桌子 | No | Yes |
| 3 | 书架 | No | Yes |
| 4 | 植物 | No | Yes |
| 5 | 地毯 | Yes | Yes |
| 6 | (未使用) | Yes | Yes |
| 7 | 椅子 | Yes | Yes |
| 8 | 传送门 | Yes | Yes |
| 9 | 沙发 | Yes | Yes |
| 10 | 咖啡机 | No | Yes |
| 11 | 窗户 | No | No |
| 12 | 门 | Yes | Yes |
| 13 | 座垫(zabuton) | Yes | Yes |
| 14 | 被褥(futon) | Yes | Yes |
| 15 | 瑜伽垫 | Yes | Yes |
| 16 | 室外区域(OD) | Yes | Yes |
| 17 | 池塘 | No | No |

玩家可走 tile: `0,5,6,7,8,9,12,13,14,15,16`
猫可走 tile: 除 `1`(墙)、`11`(窗)、`17`(池塘) 外全部

### 时间段视觉配置 (TIME_VISUALS)

| 属性 | morning | daytime | dusk | night |
|------|---------|---------|------|-------|
| windowGlass | `#d6ecff` | `#a8e0ff` | `#f6c08a` | `#2b3f62` |
| windowGlow | `rgba(140,190,255,0.10)` | `rgba(180,220,255,0.08)` | `rgba(250,185,125,0.14)` | `rgba(80,120,180,0.05)` |
| overlayColor | `rgba(120,160,200,0.05)` | null | `rgba(190,110,80,0.06)` | `rgba(12,20,48,0.12)` |
| vignetteAlpha | 0.08 | 0.1 | 0.18 | 0.36 |
| outdoorShadeAlpha | 0.08 | 0.0 | 0.1 | 0.6 |
| outdoorShadeColor | `rgba(50,90,140,1)` | null | `rgba(75,85,105,1)` | `rgba(10,22,58,1)` |
| skyColors | `#b8dcff, #87b4e8` | `#87ceeb, #b0d8f0` | `#f5b07a, #e38a6a, #6a84b8` | `#15183a, #202045` |
| starCount | 0 | 0 | 0 | 5 |

### 房间色板

**Focus Room (FOCUS_COLORS)**

| key | 值 |
|-----|------|
| floor | `#b8c4d0` |
| floorDark | `#a8b6c4` |
| wall | `#8a96a6` |
| wallTop | `#98a4b4` |
| wallDark | `#7a8898` |
| desk | `#6a7a8a` |
| deskTop | `#7a8a9a` |
| chair | `#5a7a8a` |
| bookshelf | `#5c6a78` |
| bookColors | `#c07060, #4a8ab8, #5a9a6a, #d4a040, #8a70a8` |
| plant | `#5a9a68` |
| plantPot | `#8a9aa8` |
| rug | `#8a9cb0` |
| rugAlt | `#7e90a4` |
| portal | `#e07080` |
| portalGlow | `#f0909a` |

**Rest Room (REST_COLORS)**

| key | 值 |
|-----|------|
| floor | `#8b6f55` |
| floorDark | `#7d6349` |
| wall | `#c0a0b8` |
| wallTop | `#d0b0c8` |
| wallDark | `#b090a8` |
| desk | `#a07848` |
| deskTop | `#b88858` |
| sofa | `#c07898` |
| sofaTop | `#d088a8` |
| bookshelf | `#8a6838` |
| bookColors | `#e07060, #e0a040, #60b070, #e08040, #d06090` |
| plant | `#5a9a68` |
| plantPot | `#c09060` |
| rug | `#a08070` |
| rugAlt | `#947464` |
| coffeeMachine | `#787878` |
| coffeeTop | `#909090` |
| portal | `#60a0d0` |
| portalGlow | `#80b8e0` |

### 暗角 (Vignette)
- 渐变起点: canvas 中心，半径 `canvas.height * 0.35`
- 渐变终点: canvas 中心，半径 `canvas.height * 0.85`
- 透明度: 取决于时间段 `vignetteAlpha`

### 灰尘粒子 (Dust Motes)
- 最大数量: 15
- 生成概率: 每帧 2%
- 夜晚不显示

---

## 3. 玩家系统

### 精灵参数

| 参数 | 值 |
|------|------|
| PLAYER_SIZE (碰撞半径) | 24 |
| 精灵帧尺寸 | 32×64 |
| 合成画布 | 1792×1312 |
| 移动速度 (SPEED) | 2 px/frame |
| 每方向帧数 (FRAMES_PER_DIR) | 6 |
| 站立动画间隔 (SPRITE_IDLE_MS) | 600ms |
| 行走动画间隔 (SPRITE_RUN_MS) | 100ms |

### 方向偏移 (SPRITE_DIR_OFFSET)

| 方向 | 帧偏移 |
|------|--------|
| right | 0 |
| up | 6 |
| left | 12 |
| down | 18 |

### 动画行 (ANIM_ROWS)

| 动作 | 行号 |
|------|------|
| static | 0 |
| idle | 1 |
| walk | 2 |
| sleep | 3 |
| sit | 4 |
| phone | 7 |
| exercise | 11 |

### 角色生成器 (Character Catalog)

| 部件 | 范围 |
|------|------|
| body | 1-9 |
| eyes | 1-7 |
| outfits | 33 种 |
| hairs | 29 种 |
| accessories | 19 种 |
| premade presets | 20 个 |

### 名字标签渲染
- 绘制在玩家头顶
- 字体: `bold 14px` (Canvas)
- 名字底部阴影用于可读性

### 座位系统

**座位类型偏移默认值 (SEAT_DY_DEFAULTS)**

| 类型 | 值 | up | down | left | right |
|------|------|------|------|------|-------|
| 7 | 椅子 | -8 | 0 | -20 | -20 |
| 9 | 沙发 | -4 | -4 | -16 | -16 |
| 13 | 座垫 | 0 | 0 | -8 | -8 |
| 14 | 被褥 | 0 | 0 | 0 | 0 |
| 15 | 瑜伽垫 | 0 | 0 | 0 | 0 |

椅子(7)面向桌子方向，沙发(9)面向远离墙壁方向。

---

## 4. 猫咪系统

### 精灵配置

| 参数 | 值 |
|------|------|
| 帧尺寸 | 32×32 |
| 方向采样间隔 | 200ms (CAT_DIR_SAMPLE_MS) |
| 静止动画间隔 | 250ms (CAT_SPRITE_IDLE_MS) |
| 移动动画间隔 | 120ms (CAT_SPRITE_MOVE_MS) |
| 坐下动画间隔 | 150ms (CAT_SIT_FRAME_MS) |

### 服务端更新频率
- `setInterval` 50ms (20 ticks/秒)

### 移动速度 (px/tick)

| 状态 | 速度 |
|------|------|
| gift_deliver | 7.0 |
| zoomies | 6.0 |
| curious | 5.0 |
| wander | 3.0 |
| leg_rub | 2.0 |

### AI 状态机

**状态列表**: sit, sleep, wander, curious, groom, stretch, yawn, gift_deliver, zoomies, leg_rub, stare

**休息状态持续时间 (ticks, 1 tick = 50ms)**

| 状态 | 最小 | 最大 |
|------|------|------|
| yawn | 60 | 120 |
| sleep | 400 | 1000 |
| stare | 200 | 400 |
| sit / groom / stretch | 250 | 650 |

### 时间段行为概率

**夜晚 (22:00-06:00)**

| 状态 | 概率 |
|------|------|
| sleep | 55% |
| sit | 20% |
| groom | 10% |
| stretch | 5% |
| yawn | 10% |

**早晨 (06:00-10:00)**

| 状态 | 概率 |
|------|------|
| stretch | 30% |
| yawn | 20% |
| sit | 20% |
| groom | 15% |
| sleep | 15% |

**默认 (其余时段)**

| 状态 | 概率 |
|------|------|
| sit | 35% |
| groom | 20% |
| stretch | 15% |
| yawn | 10% |
| sleep | 20% |

### 猫咪特殊行为

| 行为 | 参数 |
|------|------|
| 耳朵竖起(聊天反应) | 40 ticks (~2s) |
| 送礼计时器 | 3600 + random(3600) ticks (3-6 min) |
| 反卡检测 | 200 ticks, 16px 阈值 |
| 好奇心(新玩家) | 走向新进入房间的玩家 |
| 疲劳关怀 | 专注超 120min 的玩家, 40% 概率凑过去 |
| 家具互动 | 走到桌/沙发/书架/窗户旁坐下 |
| 跟随 | 房间没人时跟玩家换房间 |
| 点击(醒着) | 飘红心 + "Miu~" + 咕噜声 |
| 点击(睡着) | 只摇尾巴 |
| 发疯跑(zoomies) | 3% 概率, 3-4 个随机点, 速度 6.0, 最大 150 ticks |
| 蹭腿(leg_rub) | 10% 概率, 静止 5s+ 且 80px 内玩家, 椭圆路径, 速度 2.0 |
| 篝火取暖 | 20% 概率, 房间有亮篝火, 走到篝火前坐下, sleep +30% |
| 对空气发呆(stare) | 8% 概率(pickRestState), 200-400 ticks, "..." 气泡 |

---

## 5. 专注系统

### 火焰阶段参数

| 参数 | 测试值 | 生产值 |
|------|--------|--------|
| FLAME_STAGE_MS (每阶段) | 10,000ms (10s) | 1,800,000ms (30min) |
| FLAME_FULL_MS (满级) | 40,000ms (40s) | 7,200,000ms (120min) |

**火焰强度 = min(elapsed / FLAME_FULL_MS, 1.0)**

### 火焰阶段视觉

| 阶段 | 时间 | 特征 |
|------|------|------|
| 小火苗 | 0-30min | 基础火焰 |
| 中等 | 30-60min | + 光晕 |
| 较大 | 60-90min | + 火花粒子 |
| 蓝白色 | 90-120min | 蓝色调 (intensity > 0.75) |
| 疲劳 | 120min+ | 闪烁加剧 + 💧汗滴(60s周期显8s) |

### 火焰渲染参数

| 参数 | 值 |
|------|------|
| 火焰位置 | player.x + 8, player.y - 54 |
| 火焰高度 | 5 + intensity × 9 |
| 火焰宽度 | 2.5 + intensity × 4 |
| 光晕半径 | 6 + intensity × 10 |
| 光晕透明度 | 0.02 + intensity × 0.05 |

### 火焰颜色

| 条件 | 颜色 |
|------|------|
| intensity > 0.75 + lifeRatio > 0.5 | 蓝白色 RGB(170+,190+,210+) |
| lifeRatio > 0.6 | `#fff0d0` (亮黄) |
| lifeRatio > 0.3 | `#f0a040` (橙色) |
| 其他 | `#e86030` (红橙) |

### 火焰粒子

| 参数 | 值 |
|------|------|
| 粒子寿命 | 12 + random(12) 帧, maxLife=24 |
| 粒子大小 | 1 + intensity × 1.5 + random(1) |
| 垂直速度 | -0.3 - random(0.5) × (0.5 + intensity) |
| 水平漂移 | random(0.1) 每帧 |

### 疲劳检测

| 参数 | 测试值 | 生产值 |
|------|--------|--------|
| 疲劳阈值(服务端) | 40,000ms (40s) | 7,200,000ms (120min) |
| 猫咪关怀概率 | 40% | 40% |

### 专注后行为

| 参数 | 值 |
|------|------|
| emoji 静默期 | 30s |
| 自动走向传送门等待 | 30s 无操作 (IDLE_MS=30000) |
| 自动走时提示 | "Going to rest..." |
| 进入 Lounge 后显示 | ☕ |

### 有效专注类别
`working`, `studying`, `reading`, `writing`, `creating`, `exercising`

---

## 6. 礼物堆系统

### 服务端参数

| 参数 | 测试值 | 生产值 |
|------|--------|--------|
| PILE_GIFT_INTERVAL | 15,000ms (15s) | 1,800,000ms (30min) |
| MAX_GIFT_PILE | 10 | 10 |

### 礼物类型
`fish`, `leaf`, `yarn` (随机选取)

### 金字塔堆叠坐标 (PILE_POSITIONS, dx/dy 相对于玩家)

| 层 | 位置 | 坐标 |
|----|------|------|
| 底部 (4个) | 脚边 | (-10,8), (-2,10), (6,9), (14,8) |
| 中层 (3个) | 身体 | (-7,2), (2,3), (11,1) |
| 上层 (2个) | 胸口 | (-4,-5), (6,-4) |
| 顶部 (1个) | 头顶 | (1,-12) |

### 散落物理参数

| 参数 | 值 |
|------|------|
| 弹出速度 | 2 + random(2.5) |
| 垂直初速 | -2 (向上) |
| 散落方向 | 基于堆叠位置 + random(0.8) |
| 粒子寿命 | 350 帧 (~5.8s @60fps) |
| 淡出 | 最后 60 帧 (~1s) |

---

## 7. 视觉效果

### 红心粒子 (点击猫咪)

| 参数 | 值 |
|------|------|
| 颜色 | `#e74c3c` |
| 大小 | 8 |
| 寿命 | 50 帧 |
| 水平速度 | random(-0.25, 0.25) |
| 垂直速度 | -0.8 - random(0.5) (向上) |
| 生成位置 | player 上方 16px, ±3px 水平偏移 |

### 门动画

| 参数 | 值 |
|------|------|
| DOOR_FRAME_W | 64 |
| DOOR_FRAME_H | 64 |
| DOOR_OPEN_FRAMES | 7 |
| DOOR_FRAME_MS | 80ms |
| DOOR_TRIGGER_DIST | 3 × TILE (96px) |

### 对象动画帧率
`OBJ_FRAME_MS = 200ms` (地图 tileset 动画对象)

### 篝火光照

| 参数 | 值 |
|------|------|
| CAMPFIRE_LIGHT_BASE | 192px |
| CAMPFIRE_LIGHT_AMP | 8px |
| CAMPFIRE_LIGHT_PERIOD_MS | 6000ms |
| CAMPFIRE_LIGHT_ALPHA | 0.9 |
| CAMPFIRE_FRAME_MS | 320ms |
| CAMPFIRE_INTERACT_DIST | 80px |
| CAMPFIRE_IDLE_MS | 60,000ms (1min, 服务端) |
| CAMPFIRE_TOGGLE_DIST | 80px (服务端) |

**光照时间段透明度 (CAMPFIRE_LIGHT_TIME_ALPHA)**

| 时段 | alpha |
|------|-------|
| night | 1.0 |
| dusk | 0.85 |
| morning | 0.6 |
| daytime | 0.4 |

### 气泡文字
`BUBBLE_DURATION = 5000ms` ("Miu~" 等文字气泡)

### 传送门动画
- 动态发光 + 正弦波纹
- 每帧递增 `portalAnim += 0.015`
- Focus 房间底部, Rest 房间顶部

---

## 8. UI 面板

### 聊天面板

| 参数 | 值 |
|------|------|
| 尺寸 | 340 × 260px |
| 位置 | 左下角 |
| 可折叠 | 是 |
| 仅 Lounge | 是 |
| 近距离聊天范围 | 128px (4 tiles) |
| 历史记录上限 | 50 条 (服务端) |

### Z-index 层级表

| 层级 | 元素 | z-index |
|------|------|---------|
| 旋转提示 | rotate-overlay | 99999 |
| 加载画面 | loading | 100 |
| 玩家选择器 | overlap-selector | 41 |
| 玩家卡片 | player-card | 40 |
| 角色自定义 | char-customizer | 40 |
| 欢迎弹窗 | welcome | 35 |
| 专注弹窗 | focus-popup | 30 |
| 设置面板 | settings | 26 |
| 自动行走提示 | autowalk-hint | 25 |
| 聊天 | chat | 20 |
| 反应通知 | reaction-notifications | 18 |
| 坐下按钮 | sit-btn | 16 |
| 虚拟摇杆 | joystick | 15 |
| 信息栏 / 操作栏 | info-panel / action-bar | 12 |
| 房间标签 | room-label | 10 |

### 面板样式规范
- 背景: `rgba(22,33,62,0.94)`
- 圆角: `16px` (主面板), `12px` (按钮/输入框)
- 无边框 (不加 `border`)
- 阴影: 可选, `box-shadow` 用于悬浮层

### 表情反应

| 参数 | 值 |
|------|------|
| 有效反应 | 👋 💪 ❤️ ⭐ |
| 冷却时间 | 3000ms |
| emoji 静默期(进房) | 30s |

### 闲置行为

| 参数 | 值 |
|------|------|
| IDLE_MS | 30,000ms (专注后自动走) |
| DAYDREAM_MS | 300,000ms (5min, 发呆状态) |
| IDLE_LEAVE_MS | 600,000ms (10min, 自动离开) |

### 生物活跃时段

| 生物 | 活跃时段 (小时) |
|------|----------------|
| 蝴蝶(静态) | 6-8 |
| 蝴蝶(活跃) | 8-10, 15-17 |
| 蝴蝶(水面) | 12-14 |
| 青蛙 | 17-24, 0-5 |
| 鱼 | 4-8, 15-19 |

---

## 9. 音频系统

### 音效文件

| 用途 | 文件 |
|------|------|
| 工作打字 | `/sounds/typing.mp3` |
| 学习/创作书写 | `/sounds/writing.mp3` |
| 阅读翻页 | `/sounds/page-flip.mp3` |
| 猫叫 | `/sounds/cat-meow.mp3` |
| 篝火 | `/sounds/fire.mp3` |
| 青蛙 | `/sounds/frog-croaking.mp3` |
| 早晨环境 | `/sounds/morning.mp3` |
| 白天环境 | `/sounds/yuk1to-street-ambience-traffic-410714.mp3` |
| 夜晚环境 | `/sounds/night.mp3` |

### 专注音效距离衰减

| 参数 | 值 |
|------|------|
| SOUND_MAX_DIST | 150px |
| SOUND_MIN_DIST | 20px |
| SOUND_MAX_VOL | 0.6 |

### 环境音距离衰减

| 参数 | 值 |
|------|------|
| AMBIENT_MAX_DIST | 120px |
| AMBIENT_MIN_DIST | 20px |
| AMBIENT_MAX_VOL | 0.4 |

### 篝火音效

| 参数 | 值 |
|------|------|
| CAMPFIRE_SOUND_MAX_DIST | TILE × 8 (256px) |
| CAMPFIRE_SOUND_MIN_DIST | TILE × 2 (64px) |
| CAMPFIRE_SOUND_MAX_VOL | 0.5 |

### 青蛙音效

| 参数 | 值 |
|------|------|
| FROG_SOUND_MAX_DIST | TILE × 6 (192px) |
| FROG_SOUND_MIN_DIST | TILE × 1.5 (48px) |
| FROG_SOUND_MAX_VOL | 0.45 |

### 猫叫冷却
猫叫声冷却: 5000ms

---

## 10. 网络与验证

### Socket 事件表

**客户端 → 服务端**

| 事件 | 用途 |
|------|------|
| `playerMove` | 移动同步 |
| `changeRoom` | 换房间 |
| `chatMessage` | 发送聊天 |
| `setName` | 改名 |
| `setCharacter` | 更换角色 |
| `setTagline` | 设置签名 |
| `setLanguages` | 设置语言标签 |
| `setTimezoneHour` | 同步时区 |
| `setStatus` | 设置状态 |
| `startFocus` | 开始专注 |
| `endFocus` | 结束专注 |
| `playerSit` | 坐下/站起 |
| `petCat` | 摸猫 |
| `sendReaction` | 发送表情反应 |
| `toggleCampfire` | 切换篝火 |
| `intentionalClose` | 主动关闭标签 |

**服务端 → 客户端**

| 事件 | 用途 |
|------|------|
| `currentPlayers` | 初始玩家列表 |
| `roomDimensions` | 房间尺寸 |
| `chatHistory` | 聊天历史 |
| `catUpdate` | 猫咪状态同步 |
| `campfireStates` | 篝火状态 |
| `sessionRestored` | 会话恢复 |
| `playerUpdated` | 玩家信息更新 |
| `playerChangedRoom` | 玩家换房通知 |
| `playerLeft` | 玩家离开 |
| `emojiReaction` | 表情反应广播 |
| `catPetted` | 猫咪被摸广播 |
| `giftPileUpdated` | 礼物堆更新 |
| `giftPileScatter` | 礼物散落广播 |

### 字符限制 (CJK-aware display width)
CJK 字符宽度 = 2, 其他 = 1, 客户端和服务端双重校验。

| 字段 | 最大显示宽度 |
|------|-------------|
| 名字 | 20 |
| 签名(tagline) | 100 |
| 聊天消息 | 200 |

### 会话保持

| 参数 | 值 |
|------|------|
| GRACE_PERIOD_MS | 14,400,000ms (4小时) |
| 清理间隔 | 300,000ms (5分钟) |
| Socket.IO pingTimeout | 45,000ms |
| 服务端端口 | 3000 |

### 有效语言
`en`, `zh-CN`, `zh-TW`

---

## 11. 缩时录制 (Timelapse Recording)

### 原理
录制期间每 2 秒截取画布为 JPEG Blob 存入内存。停止时逐帧解码回放（双缓冲）并通过 MediaRecorder 编码为视频（`captureStream(0)` + `requestFrame()`）。
60× 加速：1 小时实际 → 60 秒视频。

### 参数

| 参数 | 值 |
|------|------|
| REC_CAPTURE_MS | 2000ms (每 2 秒截一帧) |
| REC_REPLAY_FPS | 30 (编码回放帧率) |
| REC_BITRATE | 8,000,000 (8 Mbps) |
| REC_MAX_FRAMES | 5400 (3h @ 2s/帧; 达上限自动降帧) |

### 鲁棒性

| 功能 | 说明 |
|------|------|
| 功能检测 | 缺少 MediaRecorder / captureStream / MIME 支持 → 隐藏按钮 |
| 后台暂停 | `visibilitychange` 监听，切后台暂停截帧，回来恢复 |
| 内存上限 | 达 REC_MAX_FRAMES 时丢弃偶数帧（2s→4s），可多次触发 |
| 流式解码 | 逐帧 createImageBitmap + 单帧预读，内存峰值 ≈ 2 帧 |
| 尺寸锁定 | 录制开始时锁定 canvas 尺寸，中途旋转不影响帧大小 |
| iOS 下载 | Web Share API 兜底（`navigator.share({ files })`） |
| 编码进度 | title 显示 "Encoding 42%..." / "编码中 42%..." |
| beforeunload | 关闭页面释放 recFrames 引用 |

### MIME 优先级
1. `video/mp4;codecs=avc1.42E01E` (.mp4) — Safari / Chrome
2. `video/mp4` (.mp4)
3. `video/webm;codecs=vp9` (.webm) — Firefox
4. `video/webm;codecs=vp8` (.webm)
5. `video/webm` (.webm)

### 按钮样式
- 位置: `#settings-launchers` 最左侧，40×40 icon frame
- 录制中: `.recording` class → 红色背景 `rgba(220,40,40,0.85)` + 脉冲动画 1.5s
- title: 未录制显示 "Record timelapse"，录制中显示 "Stop recording (MM:SS)"
- 不支持的浏览器: `display: none`

### 文件命名
`beside-YYYYMMDD-HHMMSS.{mp4|webm}`

### i18n

| key | EN | ZH |
|-----|-----|-----|
| recStart | Record timelapse | 录制缩时 |
| recStop | Stop recording | 停止录制 |
| recEncoding | Encoding {0}%... | 编码中 {0}%... |

---

## 12. 测试 vs 生产参数

上线前需要修改的值:

| 文件 | 参数 | 测试值 | 生产值 |
|------|------|--------|--------|
| game.js | FLAME_STAGE_MS | 10,000 (10s) | 1,800,000 (30min) |
| game.js | FLAME_FULL_MS | 40,000 (40s) | 7,200,000 (120min) |
| server.js | PILE_GIFT_INTERVAL | 15,000 (15s) | 1,800,000 (30min) |
| server.js | 猫咪疲劳检测阈值 | 40,000 (40s) | 7,200,000 (120min) |

> 当前状态: FLAME_STAGE_MS/FLAME_FULL_MS 已设为生产值。PILE_GIFT_INTERVAL = 15min (server.js:132)。猫咪疲劳检测 = 120min (server.js:979)。上线前将 PILE_GIFT_INTERVAL 改为 30min。
