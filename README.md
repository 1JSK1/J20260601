# J20260601

> Portfolio repository for resume review. The product name in the app is "智控".

智控是一套局域网设备控制原型系统，包含 React Native 移动端、FastAPI 中控后端，以及运行在被控设备上的轻量 Agent。项目重点展示移动端交互、设备配对、命令下发、执行记录、语音指令和后端接口设计。

本仓库用于简历与作品集展示，不代表完整商业发布版本。真实运行数据、密钥、数据库、日志和打包产物不会提交到仓库。

## App 展示

| 指令模式 | 语音模式 |
| --- | --- |
| ![指令模式](docs/images/text-command-mode.jpg) | ![语音模式](docs/images/voice-mode.jpg) |

## 主要功能

- 设备管理：添加、查看和维护局域网内的被控设备。
- 命令控制：支持文本指令下发，并展示接收、解析、匹配、执行、结果等阶段。
- 语音控制：集成语音识别流程，支持语音模式触发设备动作。
- 执行记录：记录每次命令的目标设备、来源、状态和时间。
- 用户隔离：后端按会话/用户维度隔离设备、命令和配置数据。
- 安全配对：中控后端与被控端通过配对 Token 进行基础校验。
- 被控端 Agent：提供打开浏览器、打开应用、Ping 等基础动作接口。

## 技术栈

- Mobile: Expo, React Native, TypeScript, Expo Router, Zustand, TanStack Query, NativeWind
- Backend: FastAPI, SQLite, Pydantic, HTTPX
- Agent: FastAPI, Python, PyInstaller packaging
- Platform: Android, Windows local network control prototype

## 项目结构

```text
.
├── app/              # Expo Router 页面
├── components/       # 移动端 UI 组件
├── services/         # API 适配、后端请求、语音能力封装
├── store/            # Zustand 状态管理
├── backend/          # 中控后端服务
├── agent_lite/       # 轻量被控端 Agent
├── packaging/        # Windows 打包配置
├── assets/           # App 图标资源
└── docs/images/      # 简历展示截图
```

## 本地运行

### 1. 移动端

```powershell
npm install
npm run start
```

Android 调试：

```powershell
npm run android
```

类型检查：

```powershell
npm run typecheck
```

### 2. 中控后端

```powershell
cd backend
pip install -r requirements.txt
python run.py --host 127.0.0.1 --port 8008
```

局域网调试时可监听所有网卡：

```powershell
python run.py --host 0.0.0.0 --port 8008
```

接口文档默认可通过 `/docs` 查看。

### 3. 被控端 Agent

```powershell
cd agent_lite
pip install -r requirements.txt
python run.py --host 127.0.0.1 --port 7821
```

局域网测试：

```powershell
python run.py --host 0.0.0.0 --port 7821
```

## 安全说明

- 请勿提交真实账号、密码、Token、腾讯云 SecretID/SecretKey、数据库和日志。
- `backend/data/*.db`、`release/`、`logs/`、`android/app/debug.keystore` 等文件已通过 `.gitignore` 排除。
- 默认配对 Token 仅用于本地开发演示，实际部署时应更换为高强度随机值。
- 本项目的语音识别配置需要在本地环境或后端配置页中填写，不应写入源码。

## 展示定位

这个仓库主要用于说明一次完整应用原型的工程实现能力：

- 移动端页面与状态管理
- 后端 API 设计与数据隔离
- 局域网设备控制链路
- 命令执行状态可视化
- App、后端、被控端的多端协同

## License

All rights reserved. This repository is provided for portfolio and resume review only. See [LICENSE](LICENSE).
