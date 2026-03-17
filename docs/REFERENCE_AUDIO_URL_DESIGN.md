# 参考曲目链接上传 · 接口设计与错误提示方案

> **背景**：支持用户通过粘贴公网音频链接进行参考创作（翻唱/扩展等），并打通项目 Brief、客户需求与创作工作台的数据流。

---

## 一、三大模块逻辑关系

### 1.1 数据流概览

```
客户中心 (Customer)
    │
    ├── 项目 A (Project) ── Brief ──┬── referenceTracks (参考曲目描述)
    │                                └── referenceTrackUrl (参考曲目链接) [新增]
    ├── 项目 B (Project) ── Brief
    └── ...
                │
                ▼
        创作工作台 (Workbench)
            ├── 从 Brief 带入 → 自动填充 referenceTrackUrl（若有）
            ├── 本地上传 / 粘贴链接 → 获取 fileUrl
            └── 开始翻唱 / 扩展 / ...
```

### 1.2 模块职责与联动

| 模块 | 职责 | 与参考链接的关联 |
|------|------|------------------|
| **客户中心** | 客户信息、沟通记录 | 客户在沟通中可能提供参考链接，需在项目 Brief 中记录 |
| **项目中心** | 项目信息、需求 Brief | Brief 新增 `referenceTrackUrl`，支持填写公网音频直链 |
| **创作工作台** | 执行创作、改编 | 从 Brief 带入时自动填充链接；支持本地上传 + 粘贴链接双入口 |

### 1.3 典型业务流程

1. **客户提供参考链接**：客户在沟通中发来「这首歌我想按这个风格翻唱」+ 链接  
2. **项目 Brief 记录**：在项目详情的 Brief 中填写 `referenceTrackUrl`  
3. **工作台执行**：进入创作工作台 → 点击「从 Brief 带入」→ 链接自动填入 → 选择翻唱/扩展 → 开始创作  

---

## 二、数据模型扩展

### 2.1 ProjectBrief 扩展

```ts
// src/lib/projects.ts

export interface ProjectBrief {
  stylePreference?: string;
  moodScene?: string;
  lyricDirection?: string;
  referenceTracks?: string;      // 参考曲目描述（如「某首歌的风格」）
  referenceTrackUrl?: string;   // 参考曲目公网直链（新增）
  specialRequirements?: string;
  freeDescription?: string;
}
```

- `referenceTracks`：保持原意，存文字描述  
- `referenceTrackUrl`：新增，存公网可访问的音频 URL（http/https）

### 2.2 工作台状态扩展

```ts
// 参考创作输入来源
type ReferenceInputSource = "file" | "url";

// 状态
referenceInputSource: ReferenceInputSource;  // 本地上传 | 粘贴链接
referenceFileUrl: string | null;            // 最终用于 API 的 fileUrl（来自上传或 URL 转换）
referenceUrlInput: string;                  // 用户粘贴的链接（未转换前）
referenceUrlLoading: boolean;               // URL 转换中
referenceUrlError: string | null;           // URL 转换错误提示
```

---

## 三、接口设计

### 3.1 新增：URL 转 fileUrl API

**路由**：`POST /api/suno/upload-from-url`

**请求**：
```json
{
  "fileUrl": "https://example.com/audio/sample.mp3"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fileUrl | string | 是 | 公网可访问的音频直链，需 http/https |

**成功响应**：
```json
{
  "fileUrl": "https://tempfile.redpandaai.co/xxx/audio/reference/sample.mp3",
  "downloadUrl": "https://tempfile.redpandaai.co/xxx/audio/reference/sample.mp3",
  "fileName": "sample.mp3",
  "expiresIn": "3天"
}
```

**错误响应**：见第四节。

### 3.2 与现有 upload-audio 的关系

| 方式 | 路由 | 输入 | 用途 |
|------|------|------|------|
| 本地上传 | `POST /api/suno/upload-audio` | base64Data / multipart file | 现有逻辑 |
| 链接上传 | `POST /api/suno/upload-from-url` | fileUrl | 新增 |

两者输出格式一致（`fileUrl`、`downloadUrl`、`fileName`），下游逻辑（upload-cover、add-vocals 等）统一使用 `fileUrl`。

### 3.3 sunoUpload.ts 扩展

```ts
/** URL 上传：从公网拉取音频并转为临时 fileUrl */
export async function sunoUploadFromUrl(params: {
  fileUrl: string;
  uploadPath?: string;
  fileName?: string;
}): Promise<SunoUploadResult> {
  // 调用 Suno File Upload API: POST /api/file-url-upload
  // 请求体: { fileUrl, uploadPath: "audio/reference", fileName }
}
```

---

## 四、错误提示方案

### 4.1 错误分类与用户提示

| 错误类型 | 触发条件 | 用户提示 | 技术说明 |
|----------|----------|----------|----------|
| **无效 URL** | 非 http(s) 或格式错误 | 「请输入有效的 http 或 https 链接」 | 前端校验 + 后端校验 |
| **链接不可访问** | 404、403、超时 | 「无法访问该链接，请确认：1) 链接可公网访问 2) 非网易云/QQ 音乐等平台链接」 | 后端请求失败 |
| **超时** | Suno 拉取超时（30s） | 「链接响应超时，请检查网络或更换链接」 | Suno API 超时 |
| **非音频类型** | MIME 非 audio/* | 「该链接不是音频文件，请提供 .mp3、.wav 等音频直链」 | 可选：Suno 返回或 HEAD 预检 |
| **文件过大** | >100MB | 「文件超过 100MB，请使用本地上传」 | Suno 限制 |
| **API 未配置** | 无 SUNO_API_KEY | 「服务未配置，请联系管理员」 | 与现有逻辑一致 |
| **服务异常** | 5xx、网络错误 | 「服务暂时不可用，请稍后重试」 | 通用兜底 |

### 4.2 前端校验（粘贴时）

```ts
function isValidAudioUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (!["http:", "https:"].includes(u.protocol)) return false;
    return true;
  } catch {
    return false;
  }
}
```

- 非 URL：提示「请输入有效的链接」
- 非 http(s)：提示「仅支持 http 或 https 链接」

### 4.3 后端错误码与前端映射

| 后端返回 | 前端展示 |
|----------|----------|
| `{ error: "INVALID_URL" }` | 「请输入有效的 http 或 https 链接」 |
| `{ error: "URL_UNREACHABLE", detail?: string }` | 「无法访问该链接，请确认可公网访问且非音乐平台链接」 |
| `{ error: "TIMEOUT" }` | 「链接响应超时，请稍后重试」 |
| `{ error: "NOT_AUDIO" }` | 「该链接不是音频文件，请提供音频直链」 |
| `{ error: "FILE_TOO_LARGE" }` | 「文件超过 100MB，请使用本地上传」 |
| `{ error: "SUNO_API_ERROR", detail?: string }` | 「上传失败：{detail}」或「服务暂时不可用」 |

### 4.4 音乐平台链接的友好提示

在「粘贴链接」输入框下方常驻提示：

> 支持公网可访问的音频直链（如 .mp3、.wav）。网易云、QQ 音乐等平台链接通常无法使用，请下载后本地上传。

---

## 五、UI 设计

### 5.1 参考创作 · 上传区

```
上传参考曲目（必填）
┌─────────────────────────────────────────────────────────────────────────┐
│  ○ 本地上传                                                              │
│    [选择文件]  未选择任何文件                                             │
│                                                                          │
│  ○ 粘贴链接                                                              │
│    [https://________________________]  [获取]                             │
│    {referenceUrlError && <p className="text-red-500 text-xs">{...}</p>}  │
│    {referenceFileUrl && <p className="text-emerald-600">已就绪，URL 有效 3 天</p>} │
│                                                                          │
│  💡 支持公网音频直链。网易云、QQ 音乐等平台链接通常无法使用。             │
└─────────────────────────────────────────────────────────────────────────┘
```

- 本地上传、粘贴链接二选一，任一成功即 `referenceFileUrl` 有值  
- 粘贴链接后点击「获取」或失焦时自动请求，展示 loading / 成功 / 错误  
- 从 Brief 带入时：若 `referenceTrackUrl` 有值，自动填入链接并触发「获取」

### 5.2 项目详情 · Brief 扩展

在「参考曲目」旁增加「参考曲目链接」：

```
参考曲目
[如：《某某歌》的风格                    ]

参考曲目链接（可选）
[https://________________________        ]
💡 可填公网音频直链，工作台「从 Brief 带入」时将自动使用
```

### 5.3 从 Brief 带入逻辑

```ts
// applyBriefToForm 扩展
if (b.referenceTrackUrl?.trim()) {
  setReferenceInputSource("url");
  setReferenceUrlInput(b.referenceTrackUrl.trim());
  // 可选：自动触发 URL 转换，或等用户点击「开始翻唱」时再转换
  fetchReferenceFromUrl(b.referenceTrackUrl.trim());
}
```

---

## 六、实施清单

### 6.1 后端

| 任务 | 说明 |
|------|------|
| `sunoUpload.ts` 新增 `sunoUploadFromUrl` | 调用 Suno `/api/file-url-upload` |
| 新增 `POST /api/suno/upload-from-url` | 接收 fileUrl，返回 fileUrl/downloadUrl |
| 错误分类与返回格式 | 按第四节实现 |

### 6.2 前端 · 工作台

| 任务 | 说明 |
|------|------|
| 上传区增加「粘贴链接」 | 单选框 + 输入框 + 获取按钮 |
| 状态：referenceInputSource, referenceUrlInput, referenceUrlLoading, referenceUrlError | 见 2.2 |
| 调用 `/api/suno/upload-from-url` | 成功写入 referenceFileUrl |
| 错误展示 | 按 4.1、4.3 映射 |
| applyBriefToForm 扩展 | 带入 referenceTrackUrl 并可选自动获取 |

### 6.3 前端 · 项目中心

| 任务 | 说明 |
|------|------|
| ProjectBrief 增加 referenceTrackUrl | 数据模型 |
| 项目详情 Brief 表单增加「参考曲目链接」 | 输入框 + 说明 |
| 新建项目表单 | 同步增加该字段（可选） |

### 6.4 文档与提示

| 任务 | 说明 |
|------|------|
| 粘贴链接区常驻提示 | 支持直链、不支持音乐平台 |
| Brief 链接字段说明 | 公网直链、工作台可带入 |

---

## 七、与客户中心的联动（可选增强）

- 客户详情页若有「沟通记录」或「需求摘要」，可支持将客户提供的链接一键写入关联项目的 Brief。
- 当前设计以「项目 Brief」为唯一入口，客户中心不直接参与链接存储，后续可按产品需求扩展。

---

**本方案在接口、错误提示、数据流与 UI 上形成闭环，并打通项目 Brief 与创作工作台，便于客户需求直达创作执行。**
