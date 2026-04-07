/**
 * Suno API（api.sunoapi.org / docs.sunoapi.org）与工作台对齐的保留策略。
 * 用于 UI 门禁：超过托管窗口后禁用「仅 taskId + audioId」链路，引导上传重投。
 *
 * 文档摘要：生成物/返回 URL 多为 14 或 15 天删除；保守按 14 天关闭 Suno ID 深度编辑。
 * File Upload 临时文件约 3 天删除（uploadUrl 仅作当次任务入口，非长期归档）。
 *
 * @see https://docs.sunoapi.org/
 */

/** 超过该天数后，不再展示基于 sunoTaskId + sunoAudioId 的深度编辑（延长/替换/分轨/Persona/视频/WAV/时间轴歌词拉取等） */
export const SUNO_HOSTED_MEDIA_RETENTION_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 是否已超过 Suno 侧托管媒体的保守保留窗口。
 * 以版本 `createdAt` 近似生成完成时间（与文档中的删除计时同一量级）。
 */
export function isBeyondSunoHostedRetention(createdAtIso: string | undefined): boolean {
  if (!createdAtIso) return true;
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > SUNO_HOSTED_MEDIA_RETENTION_DAYS * MS_PER_DAY;
}

/** 是否为本站 persist-media 落盘后的长期可读音频地址 */
export function isArchivedMasterAudioUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  return url.includes("/api/media/audio/");
}

/**
 * 能力 × 输入类型 × 保留策略（产品/开发对照表，非运行时代码路径）
 *
 * | 能力 | 保留期内主输入 | 过期后可靠路径 | 说明 |
 * |------|----------------|----------------|------|
 * | 生成详情 / 时间轴歌词 | taskId + audioId | 已存版本歌词字段 | Get Timestamped Lyrics 依赖 ID |
 * | Extend Music | audioId | uploadUrl + Upload And Extend | 文档：extend 基于平台音轨 ID |
 * | Replace Section | taskId + audioId | 无同等上传 API 时仅保留期内 | 需原任务仍在 Suno |
 * | Vocal separation | taskId + audioId | 无；须在期内完成并自存分轨 | 分离结果 URL 亦限时 |
 * | Generate Persona | taskId + audioId | 期内生成并保存 personaId | 文档要求源任务完成 |
 * | WAV / Music Video | taskId + audioId | 期内拉取并自存文件 | 输出 URL 限时 |
 * | Upload Extend / Cover / Add Vocals / Instrumental / Mashup | uploadUrl | 每次从归档重新上传拿新 URL | 上传 staging ~3 天 |
 */
