# Railway 部署指南 - custom-song-studio

> 一步一步将项目部署到 Railway，实现公网访问，支持第三阶段功能（添加人声、添加伴奏等）

---

## 前置准备

- [ ] 项目已推送到 GitHub（若未推送，见下方「步骤 0」）
- [ ] 已有 Suno API Key（https://sunoapi.org/api-key）
- [ ] 准备好登录账号密码（用于平台登录）

---

## 步骤 0：将项目推送到 GitHub（若尚未推送）

1. 打开 https://github.com ，登录
2. 点击右上角 **+** → **New repository**
3. 仓库名填：`custom-song-studio`（或任意名称）
4. 选择 **Private**（私有）或 **Public**
5. 点击 **Create repository**
6. 在本地项目目录打开终端，执行：

```bash
cd d:\song-studio\custom-song-studio
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/custom-song-studio.git
git push -u origin main
```

（将 `你的用户名` 替换为你的 GitHub 用户名）

---

## 步骤 1：注册并登录 Railway

1. 打开浏览器，访问：**https://railway.app**
2. 点击右上角 **Login**
3. 选择 **Login with GitHub**
4. 授权 Railway 访问你的 GitHub 账号
5. 登录成功后，会进入 Railway 控制台

**✅ 完成标志**：看到 Railway 的 Dashboard 界面

---

## 步骤 2：创建新项目并部署

1. 点击 **New Project**
2. 选择 **Deploy from GitHub repo**
3. 若首次使用，点击 **Configure GitHub App** 授权 Railway 访问你的仓库
4. 在仓库列表中找到 **custom-song-studio**，点击选中
5. Railway 会自动开始部署（首次约 2–5 分钟）

**✅ 完成标志**：部署状态变为 **Success**（绿色）

---

## 步骤 3：配置环境变量

1. 在项目页面，点击你的服务（卡片）
2. 点击顶部 **Variables** 标签
3. 点击 **+ New Variable**，逐个添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SUNO_API_KEY` | 你的 Suno API Key | 必填，从 sunoapi.org 获取 |
| `NEXT_PUBLIC_LOGIN_USERNAME` | 你设定的登录用户名 | 必填 |
| `NEXT_PUBLIC_LOGIN_PASSWORD` | 你设定的登录密码 | 必填 |

4. 可选变量（按需添加）：

| 变量名 | 值 |
|--------|-----|
| `SUNO_API_BASE_URL` | `https://api.sunoapi.org` |
| `MEDIA_STORAGE_PATH` | `/data/storage`（添加 Volume 后使用） |

5. 添加完成后，Railway 会自动重新部署

**✅ 完成标志**：Variables 列表中有上述变量

---

## 步骤 4：添加持久化存储（Volume）

1. 在项目页面，点击你的服务
2. 点击 **Settings** 标签
3. 找到 **Volumes** 区域，点击 **Add Volume**
4. **Mount Path** 填：`/data`
5. 点击 **Add**
6. 回到 **Variables**，添加或修改：
   - `MEDIA_STORAGE_PATH` = `/data/storage`
7. 等待自动重新部署

**✅ 完成标志**：Volumes 中显示已挂载的 Volume

---

## 步骤 5：获取公网地址

1. 在项目页面，点击你的服务
2. 点击 **Settings** 标签
3. 找到 **Networking** → **Public Networking**
4. 点击 **Generate Domain**
5. Railway 会生成一个类似 `xxx.railway.app` 的域名
6. 复制这个域名（例如：`custom-song-studio-production.up.railway.app`）

**✅ 完成标志**：获得可访问的 `https://xxx.railway.app` 地址

---

## 步骤 6：验证部署

1. 在浏览器打开：`https://你的域名.railway.app`
2. 应能看到登录页面
3. 输入你设置的 `NEXT_PUBLIC_LOGIN_USERNAME` 和 `NEXT_PUBLIC_LOGIN_PASSWORD` 登录
4. 进入 Dashboard，尝试创建项目、生成歌曲

**✅ 完成标志**：能正常登录并使用平台

---

## 常见问题

### Q：部署失败怎么办？
- 查看 Railway 的 **Deployments** → 点击失败的部署 → 查看 **View Logs**
- 常见原因：环境变量未填、构建超时

### Q：登录后刷新页面 404？
- Next.js 需要配置，一般 Railway 会自动识别，若仍有问题可反馈

### Q：媒体文件（音频/封面）不显示？
- 确认已添加 Volume 并设置 `MEDIA_STORAGE_PATH=/data/storage`
- 新部署后 storage 为空是正常的，生成新歌曲后会自动保存

### Q：如何绑定自己的域名？
- Settings → Networking → Custom Domain → 添加你的域名
- 在域名服务商处添加 CNAME 解析指向 Railway 提供的地址

---

## 部署完成后

- 公网 URL 格式：`https://你的域名.railway.app/api/media/audio/文件名.mp3`
- 第三阶段功能（添加人声、添加伴奏、上传并扩展、生成混音）将使用此公网 URL
- 建议定期备份重要数据（项目、版本信息在 localStorage，媒体在 Volume）
