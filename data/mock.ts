import { CommandHistory, CommandLog, CommandStage, Device, SettingGroup } from "./types";

export const devices: Device[] = [
  {
    id: "win-workstation",
    name: "工作站 Windows PC",
    serial: "WIN-9A21-7842",
    type: "电脑",
    system: "Windows",
    status: "online",
    model: "ThinkCentre M90q / i7 / 32GB",
    group: "工作区",
    ip: "192.168.1.42",
    host: "192.168.1.42",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "局域网在线",
    currentTask: "文件同步中",
    lastHeartbeat: "18 秒前",
    lastCommand: "打开开发环境",
    note: "主要办公电脑，允许远程指令控制。",
    metrics: [
      { label: "CPU", value: "38%" },
      { label: "内存", value: "61%" },
      { label: "电量", value: "接入电源", tone: "success" },
      { label: "温度", value: "48°C" }
    ],
    quickActions: ["锁屏", "打开应用", "同步文件"]
  },
  {
    id: "linux-home",
    name: "家庭 Linux 主机",
    serial: "LNX-HOME-2301",
    type: "主机",
    system: "Linux",
    status: "online",
    model: "Ubuntu Server 24.04 / Ryzen 5",
    group: "家中",
    ip: "192.168.1.12",
    host: "192.168.1.12",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "远程隧道可用",
    currentTask: "备份任务空闲",
    lastHeartbeat: "42 秒前",
    lastCommand: "查看磁盘空间",
    note: "承担家庭备份、媒体服务和网关辅助任务。",
    metrics: [
      { label: "CPU", value: "12%" },
      { label: "内存", value: "44%" },
      { label: "磁盘", value: "72%", tone: "warning" },
      { label: "温度", value: "52°C" }
    ],
    quickActions: ["查看服务", "重启服务", "执行脚本"]
  },
  {
    id: "mac-studio",
    name: "设计 Mac",
    serial: "MAC-STU-7710",
    type: "电脑",
    system: "macOS",
    status: "offline",
    model: "Mac mini M2",
    group: "办公室",
    ip: "10.8.0.33",
    host: "10.8.0.33",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "远程不可达",
    currentTask: "无活动任务",
    lastHeartbeat: "2 小时前",
    lastCommand: "同步素材目录",
    note: "设计和素材处理设备，当前可能处于睡眠状态。",
    metrics: [
      { label: "CPU", value: "--" },
      { label: "内存", value: "--" },
      { label: "电量", value: "接入电源" },
      { label: "温度", value: "--" }
    ],
    quickActions: ["唤醒", "同步素材"]
  },
  {
    id: "android-phone",
    name: "Pixel 安卓手机",
    serial: "AND-PX8-2026",
    type: "手机",
    system: "Android",
    status: "online",
    model: "Pixel 8 Pro",
    group: "随身设备",
    ip: "192.168.1.66",
    host: "192.168.1.66",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "局域网在线",
    currentTask: "等待语音指令",
    lastHeartbeat: "9 秒前",
    lastCommand: "读取通知摘要",
    note: "安卓优先控制端，也可作为被控设备。",
    metrics: [
      { label: "CPU", value: "24%" },
      { label: "内存", value: "57%" },
      { label: "电量", value: "86%", tone: "success" },
      { label: "温度", value: "36°C" }
    ],
    quickActions: ["响铃", "勿扰模式", "读取通知"]
  },
  {
    id: "iphone-main",
    name: "iPhone 主力机",
    serial: "IOS-15P-6044",
    type: "手机",
    system: "iOS",
    status: "warning",
    model: "iPhone 15 Pro",
    group: "随身设备",
    ip: "192.168.1.71",
    host: "192.168.1.71",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "局域网受限",
    currentTask: "权限待确认",
    lastHeartbeat: "6 分钟前",
    lastCommand: "检查电量",
    note: "iOS 能力受系统权限限制，后续需区分可用能力。",
    metrics: [
      { label: "CPU", value: "--" },
      { label: "内存", value: "--" },
      { label: "电量", value: "31%", tone: "warning" },
      { label: "温度", value: "--" }
    ],
    quickActions: ["检查权限", "响铃"]
  },
  {
    id: "living-speaker",
    name: "客厅智能音响",
    serial: "SPK-LR-3320",
    type: "音响",
    system: "Other",
    status: "online",
    model: "Home Audio Gateway",
    group: "客厅",
    ip: "192.168.1.88",
    host: "192.168.1.88",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "局域网在线",
    currentTask: "播放暂停",
    lastHeartbeat: "25 秒前",
    lastCommand: "降低音量到 30%",
    note: "支持基础播放、音量和场景联动。",
    metrics: [
      { label: "CPU", value: "8%" },
      { label: "内存", value: "22%" },
      { label: "电量", value: "接入电源" },
      { label: "温度", value: "34°C" }
    ],
    quickActions: ["播放", "暂停", "调节音量"]
  },
  {
    id: "patrol-car",
    name: "桌面巡检小车",
    serial: "CAR-DESK-1098",
    type: "小车",
    system: "Other",
    status: "offline",
    model: "ESP32 Rover Kit",
    group: "工作区",
    ip: "192.168.1.95",
    host: "192.168.1.95",
    port: 7821,
    pairingTokenConfigured: true,
    connection: "局域网离线",
    currentTask: "无活动任务",
    lastHeartbeat: "昨天 23:10",
    lastCommand: "返回充电座",
    note: "实验设备，后续可扩展移动控制和摄像头能力。",
    metrics: [
      { label: "CPU", value: "--" },
      { label: "内存", value: "--" },
      { label: "电量", value: "未知" },
      { label: "温度", value: "--" }
    ],
    quickActions: ["返回充电", "开始巡检"]
  }
];

export const commandStages: CommandStage[] = [
  { key: "receive", label: "接收指令", status: "done" },
  { key: "parse", label: "解析意图", status: "done" },
  { key: "match", label: "匹配设备", status: "done" },
  { key: "execute", label: "执行操作", status: "error" },
  { key: "result", label: "返回结果", status: "waiting" }
];

export const commandLogs: CommandLog[] = [
  { id: "l1", time: "14:32:01", level: "info", message: "收到指令：检查所有在线设备状态。" },
  { id: "l2", time: "14:32:02", level: "success", message: "意图解析完成，识别为设备状态查询。" },
  { id: "l3", time: "14:32:03", level: "info", message: "匹配到 4 台在线设备，2 台离线设备，1 台异常设备。" },
  { id: "l4", time: "14:32:04", level: "warning", message: "iPhone 主力机权限受限，仅返回可用状态字段。" },
  { id: "l5", time: "14:32:05", level: "success", message: "状态聚合完成，等待用户确认下一步操作。" }
];

export const commandHistory: CommandHistory[] = [
  {
    id: "c1",
    command: "检查所有在线设备状态",
    result: "成功",
    time: "今天 14:32",
    target: "全部设备",
    detail: "返回在线、离线、异常状态，并生成简要摘要。"
  },
  {
    id: "c2",
    command: "重启家庭 Linux 主机上的媒体服务",
    result: "成功",
    time: "今天 10:18",
    target: "家庭 Linux 主机",
    detail: "已模拟完成服务重启流程。"
  },
  {
    id: "c3",
    command: "关闭所有电脑",
    result: "等待确认",
    time: "昨天 22:40",
    target: "Windows PC、Mac",
    highRisk: true,
    detail: "高风险批量关机指令，Phase 1 仅展示确认流程。"
  },
  {
    id: "c4",
    command: "让客厅音响音量调到 30%",
    result: "成功",
    time: "昨天 19:12",
    target: "客厅智能音响",
    detail: "音量调整指令展示态。"
  }
];

export const deviceLogs: CommandLog[] = [
  { id: "d1", time: "14:28:20", level: "info", message: "设备心跳正常，延迟 24ms。" },
  { id: "d2", time: "14:22:10", level: "success", message: "指令执行完成：读取系统状态。" },
  { id: "d3", time: "13:55:43", level: "warning", message: "检测到内存占用超过 60%，已记录。" },
  { id: "d4", time: "13:02:11", level: "info", message: "远程连接通道保持可用。" }
];

export const settingGroups: SettingGroup[] = [
  {
    title: "API 配置",
    items: [
      { label: "API Key", value: "未配置", icon: "KeyRound", route: "/settings/api-key" },
      { label: "Base URL", value: "https://api.example.com", icon: "Globe", route: "/settings/base-url" },
      { label: "API 模式", value: "Mock", icon: "Settings", route: "/settings/api-mode" },
      { label: "模型选择", value: "gpt-4.1-mini", icon: "Brain", route: "/settings/model" },
      { label: "请求超时时间", value: "30 秒", icon: "Timer", route: "/settings/timeout" },
      { label: "最大重试次数", value: "2 次", icon: "RefreshCcw", route: "/settings/retry" },
      { label: "连接测试", value: "模拟测试", icon: "Wifi", route: "/settings/connection-test" }
    ]
  },
  {
    title: "用户账号",
    items: [
      { label: "账号信息", value: "个人用户", icon: "UserRound", route: "/settings/account" },
      { label: "修改密码", icon: "Lock", route: "/settings/password" },
      { label: "登录设备管理", value: "3 台", icon: "Monitor", route: "/settings/sessions" },
      { label: "退出登录", icon: "LogOut", danger: true, route: "/settings/logout" }
    ]
  },
  {
    title: "主题配置",
    items: [
      { label: "深色模式", value: "默认", icon: "Moon", route: "/settings/dark" },
      { label: "浅色模式", value: "可切换", icon: "Sun", route: "/settings/light" }
    ]
  },
  {
    title: "权限设置",
    items: [
      { label: "麦克风权限", value: "待授权", icon: "Mic", route: "/settings/microphone" },
      { label: "通知权限", value: "已允许", icon: "Bell", route: "/settings/notification" },
      { label: "局域网权限", value: "待检查", icon: "Wifi", route: "/settings/lan" },
      { label: "后台运行权限", value: "建议开启", icon: "Activity", route: "/settings/background" }
    ]
  },
  {
    title: "系统信息",
    items: [
      { label: "当前版本", value: "0.1.0", icon: "Info", route: "/settings/version" },
      { label: "检查更新", value: "Phase 1 占位", icon: "Download", disabled: true },
      { label: "使用说明", icon: "BookOpen", route: "/settings/help" },
      { label: "问题反馈", icon: "MessageSquare", route: "/settings/feedback" },
      { label: "隐私政策", icon: "Shield", route: "/settings/privacy" }
    ]
  }
];
