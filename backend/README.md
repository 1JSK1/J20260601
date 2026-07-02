# My App Backend

这是主控 App 使用的中控后端服务。当前版本负责保存用户设备、隔离不同用户数据、转发局域网设备动作，并记录命令历史。

## 运行

```powershell
python backend/run.py --host 127.0.0.1 --port 8008
```

如果要让局域网内其他主控设备访问这个后端，可以改成：

```powershell
python backend/run.py --host 0.0.0.0 --port 8008
```

## 用户隔离

开发期使用 `X-User-Id` 请求头表示当前用户：

```http
X-User-Id: user-local-default
```

没有传这个请求头时，会使用默认本机用户 `user-local-default`。后续接登录鉴权后，应由服务端从登录 token/session 中解析真实 `user_id`，不能继续信任客户端直接传入的用户 ID。

## 数据表

默认 SQLite 文件：

```text
backend/data/my_app.db
```

当前表：

- `users`
- `devices`
- `commands`
- `device_logs`
- `api_configs`
- `user_sessions`

其中 `devices`、`commands`、`device_logs`、`api_configs`、`user_sessions` 都带 `user_id`，接口查询会按当前用户过滤，避免不同用户设备互通。

## 接口

- `GET /`
- `GET /health`
- `GET /me`
- `GET /api-config`
- `GET /devices`
- `POST /devices`
- `GET /devices/{device_id}`
- `DELETE /devices/{device_id}`
- `GET /devices/{device_id}/logs`
- `POST /devices/{device_id}/test`
- `POST /devices/{device_id}/actions/open-url`
- `POST /devices/{device_id}/actions/open-app`
- `GET /commands`
- `GET /commands/{command_id}`
