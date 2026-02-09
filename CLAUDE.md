# Stay Together - 多人在线陪伴空间

## 技术栈
Express + Socket.IO + HTML5 Canvas (无框架)

## 启动
npm start (端口 3000)

## 文件结构
- server.js: 服务端，猫咪AI状态机，房间管理，Socket事件
- public/index.html: 页面布局，CSS样式，聊天面板
- public/js/game.js: 客户端渲染，玩家操作，猫咪绘制，音频

## 两个房间
- Focus Zone: 专注工作区，无聊天，底部传送门通往Rest
- Rest Zone: 休息区，有聊天(左下角可折叠)，顶部传送门通往Focus

## 猫咪系统
- 服务端AI: 独立行为，状态机(sit/sleep/wander/curious/groom/stretch/yawn/gift_deliver)
- 时间感知: 夜晚多睡觉，早晨多伸懒腰
- 人数感知: 房间人越多越活跃
- 好奇心: 新玩家进入房间会凑过去看
- 送礼物: 随机叼fish/leaf/yarn送给玩家
- 家具互动: 会走到桌子/沙发/书架/窗户旁坐下
- 跟随: 房间没人时会跟着玩家换房间
- 点击互动: 醒着→飘一颗红心+"Miu~"文字+咕噜声，睡着→只摇尾巴
- 聊天反应: Rest区有人聊天时耳朵竖起来(!)

## 视觉风格
星露谷物语风格 - 温暖明亮的配色，柔和暗角
双层渲染架构(drawPlayerBody/drawPlayerLabel, drawCatBody/drawCatUI)

## 部署
- GitHub: https://github.com/jnxwork/stay-together.git
- 可部署到 Render.com (免费)
- 临时分享: cloudflared tunnel --url http://localhost:3000 --protocol http2

## 待做
- 背景音乐/音效（用户自行配置，音频区块已留空壳）
