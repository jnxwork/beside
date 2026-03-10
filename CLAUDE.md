# Beside - 多人在线陪伴空间

> **写代码前必读 [DESIGN.md](DESIGN.md)**：所有 UI 数值、配色、间距、动画参数、音频参数以此为准，不要凭记忆猜测。

## 技术栈
Express + Socket.IO + HTML5 Canvas (无框架)

## 启动
npm start (端口 3000)

## 文件结构
- server.js: 服务端，猫咪AI状态机，房间管理，Socket事件，专注/礼物堆状态
- public/index.html: 页面布局，CSS样式，聊天面板，专注弹窗，语言切换
- public/js/game.js: 客户端渲染，玩家操作，猫咪绘制，火焰/粒子系统，i18n，音频

## 两个房间
- Focus Zone: 专注工作区，无聊天，底部传送门通往Lounge
- Lounge: 休闲区，有聊天(左下角可折叠)，顶部传送门通往Focus
- 房间特定状态预设: Focus(studying/working/reading/coding), Lounge(resting/chatting/listening/napping)
- 进入Focus Zone时自动设为studying，emoji静默30s；进入Lounge时自动设为resting

## 专注计时器 (Focus Timer)
- Focus Zone内点击"Start Focus"→弹窗选择类别(Study/Work/Create/Read)+可选任务名→开始计时
- 自己: UI栏显示任务名+精确计时(MM:SS，超1小时HH:MM:SS)
- 他人: 只能看到头顶火焰动画(隐私设计，无文字/数字)
- 头顶显示: 状态emoji在左，火焰在右
- 火焰阶段(每30min递增，当前测试用10s): 小火苗→中等+光晕→较大+火花→蓝白色→疲劳闪烁+💧汗滴(60s周期显8s)
- 专注中走到传送门: 弹窗确认是否结束专注，选择继续则自动推回安全位置
- 结束专注: emoji静默30s→30s无操作自动走向传送门("Going to rest...")→进入Lounge后显示☕
- 专注记录存localStorage(taskName/category/duration/startTime/endTime)，保留最近100条
- 服务端只存isFocusing/focusStartTime/focusCategory，任务名不上传(隐私)

## 礼物堆系统 (Gift Pile)
- Lounge内玩家长时间不动→猫咪每30min(测试用15s)叼一个礼物(fish/leaf/yarn随机)走过来
- 礼物按金字塔堆在玩家身上: 脚边4个→身体3个→胸口2个→头顶1个，最多10个
- 猫咪送完后在旁边坐一会儿欣赏
- 猫咪若在Focus Zone会主动跑去Lounge送礼
- 玩家移动时: 礼物向四周弹散→落地停留5s→淡出消失
- 服务端同步: 其他玩家也能看到礼物堆

## 猫咪系统
- 服务端AI: 独立行为，状态机(sit/sleep/wander/curious/groom/stretch/yawn/gift_deliver/zoomies/leg_rub/stare)
- 时间感知: 夜晚多睡觉，早晨多伸懒腰
- 人数感知: 房间人越多越活跃
- 好奇心: 新玩家进入房间会凑过去看
- 送礼物: 随机叼fish/leaf/yarn送给玩家
- 礼物堆: 给Lounge挂机玩家持续送礼物堆叠
- 疲劳关怀: 专注超120min(测试用40s)的玩家，猫咪有40%概率凑过去
- 家具互动: 会走到桌子/沙发/书架/窗户旁坐下
- 跟随: 房间没人时会跟着玩家换房间
- 点击互动: 醒着→飘一颗红心+"Miu~"文字+咕噜声，睡着→只摇尾巴
- 聊天反应: Lounge有人聊天时耳朵竖起来(!)
- 发疯跑(zoomies): 3%概率突然高速跑3-4个随机点，跑完坐下喘气
- 蹭腿(leg_rub): 静止5s+的近距离玩家，10%概率围绕其椭圆路径蹭一圈，飘小红心
- 篝火取暖: 房间有亮篝火时20%概率走过去坐下，更容易睡着(+30%)
- 对空气发呆(stare): 8%概率进入look动画+"..."气泡，持续10-20s

## i18n 国际化
- 支持英文(en)和中文(zh)
- 自动检测系统语言(navigator.language)
- UI栏语言切换按钮(EN/中文)
- 偏好存localStorage
- 所有UI文字通过t(key)函数获取翻译

## 视觉风格
星露谷物语风格 - 温暖明亮的配色，柔和暗角
双层渲染架构(drawPlayerBody/drawPlayerLabel, drawCatBody/drawCatUI)
粒子系统: 红心(点击猫咪)、火焰(专注状态)、礼物散落

## 安全出生点
- 服务端维护地图碰撞数据(buildFocusMap/buildRestMap)
- getInitialSpawn()/getPortalSpawn()验证出生点不在家具上(isSpawnSafe)

## 部署
- GitHub: https://github.com/jnxwork/beside.git
- 可部署到 Render.com (免费)
- 临时分享: cloudflared tunnel --url http://localhost:3000 --protocol http2

## 测试参数 (上线前改回生产值)
- game.js FLAME_STAGE_MS: 10000→1800000 (火焰阶段30min)
- game.js FLAME_FULL_MS: 40000→7200000 (火焰满级120min)
- server.js PILE_GIFT_INTERVAL: 15000→1800000 (礼物堆间隔30min)
- server.js 猫咪疲劳检测: 40000→120*60*1000 (疲劳关怀120min)

## 待做
- 背景音乐/音效（用户自行配置，音频区块已留空壳）
- 专注历史查看UI
- 移除服务端debug日志(搜索[PILE])
