# My App Lite Agent

轻量被控端服务，用于第一版局域网控制验证。

当前能力：

- `GET /health`
- `GET /device/info`
- `POST /actions/open-url`
- `POST /actions/open-app`
- `POST /actions/ping`

默认只监听本机：

```powershell
python agent_lite/run.py
```

局域网测试时再显式开放：

```powershell
python agent_lite/run.py --host 0.0.0.0 --port 7821
```

安全默认策略：

- 默认需要请求头 `X-Pairing-Token`。
- 默认 token 是 `dev-token`，只适合本地开发。
- `open-app` 第一版只允许白名单应用别名，不直接执行任意命令。

示例：

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:7821/actions/open-url `
  -Method Post `
  -Headers @{ "X-Pairing-Token" = "dev-token" } `
  -ContentType "application/json" `
  -Body '{"url":"https://example.com"}'
```
