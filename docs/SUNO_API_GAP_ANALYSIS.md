# Suno API 功能缺口分析

> 基于 [Suno API 文档](https://docs.sunoapi.org/cn) 与 [llms.txt 索引](https://docs.sunoapi.org/llms.txt) 对比平台已实现功能

---

## 一、已实现的 API

| 功能 | API 端点 | 平台实现 | 说明 |
|------|----------|----------|------|
| 音乐生成 | `/api/v1/generate` | ✅ sunoGenerate | 定制创作、参考翻唱 |
| 音乐生成详情 | `/api/v1/generate/record-info` | ✅ sunoGetRecordInfo | 轮询任务状态 |
| 延长音乐 | `/api/v1/generate/extend` | ✅ sunoExtend | 深度编辑 |
| 替换音乐分区 | `/api/v1/generate/replace-section` | ✅ sunoReplaceSection | 深度编辑 |
| 上传并翻唱 | `/api/v1/generate/upload-cover` | ✅ sunoUploadCover | 参考创作模式 |
| 生成 Persona | `/api/v1/generate/generate-persona` | ✅ sunoGeneratePersona | 深度编辑 |
| 时间戳歌词 | `/api/v1/generate/get-timestamped-lyrics` | ✅ sunoGetTimestampedLyrics | 歌词同步展示 |
| 人声分离 | `/api/v1/vocal-removal/generate` | ✅ sunoSeparateVocals | 深度编辑 |
| 人声分离详情 | `/api/v1/vocal-removal/record-info` | ✅ sunoGetVocalSeparationInfo | 轮询分离结果 |
| 创建音乐视频 | `/api/v1/mp4/generate` | ✅ sunoCreateMusicVideo | 深度编辑 |
| 音乐视频详情 | `/api/v1/mp4/record-info` | ✅ sunoGetMusicVideoInfo | 轮询视频结果 |
| URL 文件上传 | File Upload API | ✅ upload-from-url | 为 upload-cover 提供 uploadUrl |

---

## 二、未实现的 API（按优先级）

### 🔴 高价值：创作/编辑核心能力

| 功能 | API 端点 | 输入要求 | 价值说明 |
|------|----------|----------|----------|
| **上传并扩展** | `/api/v1/generate/upload-extend` | uploadUrl（公网音频） | 用户上传自己的音频，AI 续写拉长，不依赖 Suno 生成的版本 |
| **添加人声** | `/api/v1/generate/add-vocals` | uploadUrl（伴奏）、prompt、style、title | 只有伴奏时，AI 生成人声；卡拉OK、demo 创作场景 |
| **添加伴奏** | `/api/v1/generate/add-instrumental` | uploadUrl（人声）、tags、title | 只有人声时，AI 生成伴奏；歌手/词曲作者快速出 demo |
| **生成混音** | `/api/v1/generate/mashup` | 两个音频 | 两首歌混在一起，创意玩法 |

### 🟡 中价值：辅助与专业能力

| 功能 | API 端点 | 输入要求 | 价值说明 |
|------|----------|----------|----------|
| **AI 歌词生成** | `/api/v1/lyrics/generate`（或类似） | 主题/风格描述 | 不生成音频，仅生成歌词；创作辅助，用户可再用于定制创作 |
| **WAV 格式转换** | `/api/v1/convert/wav` | 已有音频 URL | 导出专业级 WAV，适合后期混音、母带 |
| **音乐风格增强** | `/api/v1/style/generate` | content（风格描述） | 将用户模糊描述优化为更专业的 prompt；创作辅助 |
| **生成 MIDI** | `/api/v1/generate/midi`（或类似） | 分离后的分轨 | 人声分离后转 MIDI，适合编曲、二次创作 |

### 🟢 低价值：工具与账户

| 功能 | API 端点 | 价值说明 |
|------|----------|----------|
| **剩余积分查询** | `/api/v1/credits` 或类似 | 展示账户余额，避免超限 |
| **音乐封面生成** | `/api/v1/cover/generate`（Cover Suno） | 为歌曲生成封面图，非音频翻唱 |

---

## 三、输入要求与依赖

| 能力 | 输入 | 平台数据是否满足 |
|------|------|------------------|
| 上传并扩展 | uploadUrl（公网可访问） | ⚠️ 需公网 audioUrl，本地 `/api/media/audio/xxx` 需部署后具备域名 |
| 添加人声 | uploadUrl（伴奏） | ⚠️ 同上；人声分离得到的伴奏可用 |
| 添加伴奏 | uploadUrl（人声） | ⚠️ 同上；人声分离得到的人声可用 |
| 生成混音 | 两个音频 URL | ⚠️ 需查具体参数 |
| AI 歌词生成 | 主题/风格 | ✅ 无需音频 |
| WAV 转换 | 音频 URL（Suno 生成或公网） | ⚠️ Suno 生成的可用 taskId+audioId；本地需公网 URL |
| 风格增强 | 文本描述 | ✅ 无需音频 |
| 生成 MIDI | 分轨 URL | ⚠️ 依赖人声分离结果 |

---

## 四、实施建议

### 第一阶段：零门槛能力（无需 uploadUrl）

1. **音乐风格增强**：在创作工作台「描述/创意」旁增加「一键优化」按钮，调用 style/generate 优化用户输入
2. **AI 歌词生成**：新增「AI 写词」入口，生成歌词后供创作使用
3. **剩余积分查询**：在 Dashboard 或设置页展示余额

### 第二阶段：基于 Suno 生成版本的能力

4. **WAV 格式转换**：对已有版本（有 taskId/audioId 或 Suno 原 URL）提供「导出 WAV」选项
5. **生成 MIDI**：人声分离完成后，增加「生成 MIDI」入口（若 API 支持）

### 第三阶段：需公网 URL 的能力

6. **添加人声 / 添加伴奏**：需解决 uploadUrl 来源（部署后本地 URL、或 OSS 临时链接）
7. **上传并扩展**：同上
8. **生成混音**：需两个公网音频 URL

---

## 五、技术调研详情（API 文档核实）

### 5.1 AI 歌词生成

| 项目 | 说明 |
|------|------|
| **API 路径** | `POST /api/v1/lyrics` |
| **请求参数** | `prompt`（必填，最大 200 字符）、`callBackUrl`（必填） |
| **响应** | `data.taskId` |
| **回调** | `data.data[]` 数组，每项含 `text`（歌词）、`title`、`status`、`errorMessage`；多首变体供选择 |
| **轮询** | `GET /api/v1/lyrics/record-info?taskId=xxx` |
| **状态** | PENDING、SUCCESS、CREATE_TASK_FAILED、GENERATE_LYRICS_FAILED、CALLBACK_EXCEPTION、SENSITIVE_WORD_ERROR |

歌词含 `[Verse]`、`[Chorus]` 等结构标签，可直接用于定制创作。

参考：[生成歌词](https://docs.sunoapi.org/cn/suno-api/generate-lyrics)、[歌词生成详情](https://docs.sunoapi.org/cn/suno-api/get-lyrics-generation-details)

---

### 5.2 WAV 转换

| 项目 | 说明 |
|------|------|
| **API 路径** | `POST /api/v1/wav/generate` |
| **请求参数** | `taskId`（必填）、`audioId`（必填）、`callBackUrl`（必填） |
| **输入方式** | ✅ **支持 taskId + audioId**，无需传 URL |
| **响应** | `data.taskId` |
| **回调** | `data.audioWavUrl`（WAV 下载链接） |
| **轮询** | `GET /api/v1/wav/record-info?taskId=xxx` |
| **状态** | PENDING、SUCCESS、CREATE_TASK_FAILED、GENERATE_WAV_FAILED、CALLBACK_EXCEPTION |

**结论**：平台已有版本的 `sunoTaskId`、`sunoAudioId` 可直接使用，无需公网 URL。

参考：[转换为 WAV 格式](https://docs.sunoapi.org/cn/suno-api/convert-to-wav-format)、[WAV 转换详情](https://docs.sunoapi.org/cn/suno-api/get-wav-conversion-details)

---

### 5.3 生成 MIDI

| 项目 | 说明 |
|------|------|
| **API 路径** | `POST /api/v1/midi/generate` |
| **前置条件** | ⚠️ **必须**先用人声分离 API，且 `type: split_stem`（分轨模式） |
| **请求参数** | `taskId`（人声分离任务 ID，必填）、`callBackUrl`（必填）、`audioId`（可选） |
| **audioId 来源** | 人声分离详情的 `response.originData[].id` |
| **audioId 含义** | 不传则对所有分轨生成 MIDI；传则仅对指定分轨生成 |
| **响应** | `data.taskId` |
| **回调** | 含各乐器的 MIDI 音符数据（pitch、start、end、velocity） |

**与人声分离的衔接**：

- 当前平台人声分离支持 `separate_vocal`（人声/伴奏）和 `split_stem`（多乐器分轨）
- **生成 MIDI 仅支持 `split_stem`** 分离结果
- 当前 UI 仅暴露 `separate_vocal`，实现 MIDI 时需新增「分轨分离」入口（`split_stem`）或在人声分离时提供类型选择
- 流程：选版本 → 人声分离（`split_stem`）→ 分离完成后 → 生成 MIDI（用人声分离的 taskId）
- `originData` 示例：`[{ id: "xxx", stem_type_group_name: "Vocals", ... }, { id: "yyy", stem_type_group_name: "Drums", ... }]`

参考：[Generate MIDI from Audio](https://docs.sunoapi.org/suno-api/generate-midi)、[获取人声分离详情](https://docs.sunoapi.org/cn/suno-api/get-vocal-separation-details)

---

## 六、参考链接

- [Suno API 文档](https://docs.sunoapi.org/cn)
- [llms.txt 索引](https://docs.sunoapi.org/llms.txt)
- [添加人声](https://docs.sunoapi.org/suno-api/add-vocals.md)
- [添加伴奏](https://docs.sunoapi.org/suno-api/add-instrumental.md)
- [音乐风格增强](https://docs.sunoapi.org/suno-api/boost-music-style.md)
