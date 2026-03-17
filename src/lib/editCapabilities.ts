/**
 * 深度编辑能力注册表
 * 便于新增能力，参数驱动
 * Phase 3: 扩展 inputType、category 为 Phase 4 能力补齐做准备
 */

export const EDIT_CAPABILITY_IDS = [
  "extend",
  "replace",
  "separate",
  "persona",
  "musicVideo",
] as const;

export type EditCapabilityId = (typeof EDIT_CAPABILITY_IDS)[number];

/** 输入类型：决定能力需要什么 */
export type EditInputType =
  | "suno_ids"       // taskId + audioId，仅 Suno 生成音频
  | "upload_url"     // 1 个 uploadUrl（上传或版本转 upload）
  | "upload_url_list"; // 2+ 个 uploadUrl（如混音）

/** 能力分类：用于 UI 分组 */
export type EditCapabilityCategory =
  | "edit_version"   // 改编-基于版本
  | "edit_upload"    // 改编-基于上传（Phase 4）
  | "export"         // 导出（WAV、MIDI）
  | "tool"           // 辅助工具
  | "video";         // 视频制作

export interface EditCapabilityDef {
  id: EditCapabilityId;
  label: string;
  description: string;
  /** 确认弹窗中的详细说明 */
  confirmDetail: string;
  /** 需要 sunoTaskId + sunoAudioId */
  needsSunoIds: boolean;
  /** 是否异步（需轮询），false 表示同步返回 */
  async: boolean;
  /** Phase 3: 输入类型，用于输入来源统一 */
  inputType?: EditInputType;
  /** Phase 3: 能力分类 */
  category?: EditCapabilityCategory;
  /** Phase 3: 条件不满足时的提示 */
  unmetHint?: string;
}

export const EDIT_CAPABILITIES: Record<EditCapabilityId, EditCapabilityDef> = {
  extend: {
    id: "extend",
    label: "延长音乐",
    description: "从末尾续写，保留原风格，生成更长音轨",
    confirmDetail: "将从当前歌曲末尾续写，自动沿用原风格、人声和歌词结构，生成更长的音轨。模型版本会与源音乐保持一致。完成后会创建新版本。",
    needsSunoIds: true,
    async: true,
    inputType: "suno_ids",
    category: "edit_version",
    unmetHint: "请选择 Suno 生成的版本",
  },
  replace: {
    id: "replace",
    label: "替换分区",
    description: "选择时间区间，用新内容替换该段落",
    confirmDetail: "选择 6–60 秒的时间区间，用新的音乐内容替换该段落。需填写替换描述、风格标签和标题。完成后会创建新版本。",
    needsSunoIds: true,
    async: true,
    inputType: "suno_ids",
    category: "edit_version",
    unmetHint: "请选择 Suno 生成的版本",
  },
  separate: {
    id: "separate",
    label: "人声分离",
    description: "分离人声与伴奏，可导出卡拉OK 伴奏",
    confirmDetail: "将当前歌曲分离为人声轨和伴奏轨，可导出纯人声或纯伴奏（卡拉OK 伴奏）。完成后可在编辑任务记录中查看人声和伴奏链接。",
    needsSunoIds: true,
    async: true,
    inputType: "suno_ids",
    category: "edit_version",
    unmetHint: "请选择 Suno 生成的版本",
  },
  persona: {
    id: "persona",
    label: "生成 Persona",
    description: "基于此人声创建固定风格，用于后续生成",
    confirmDetail: "基于当前歌曲的人声特点创建 Persona，后续生成新歌时可选用此人声风格。需填写名称和风格描述，完成后会返回 personaId 供后续使用。",
    needsSunoIds: true,
    async: false,
    inputType: "suno_ids",
    category: "edit_version",
    unmetHint: "请选择 Suno 生成的版本",
  },
  musicVideo: {
    id: "musicVideo",
    label: "创建音乐视频",
    description: "为音轨生成 MP4 可视化视频，适合小样展示",
    confirmDetail: "将为当前歌曲生成带可视化效果的 MP4 视频，与音乐同步，适合发给客户做小样展示或社交媒体分享。视频保留 15 天。",
    needsSunoIds: true,
    async: true,
    inputType: "suno_ids",
    category: "video",
    unmetHint: "请选择 Suno 生成的版本",
  },
};

export function getEditCapability(id: string): EditCapabilityDef | undefined {
  return EDIT_CAPABILITIES[id as EditCapabilityId];
}

// ========== Phase 4: 基于上传的能力 ==========

export const UPLOAD_CAPABILITY_IDS = [
  "uploadExtend",
  "addVocals",
  "addInstrumental",
  "mashup",
] as const;

export type UploadCapabilityId = (typeof UPLOAD_CAPABILITY_IDS)[number];

export interface UploadCapabilityDef {
  id: UploadCapabilityId;
  label: string;
  description: string;
  /** 功能说明（确认弹窗中展示） */
  confirmDetail: string;
  /** 需要 1 个还是 2 个 uploadUrl */
  inputCount: 1 | 2;
  /** 输入说明（如「伴奏」「人声」） */
  inputHint: string;
}

export const UPLOAD_CAPABILITIES: Record<UploadCapabilityId, UploadCapabilityDef> = {
  uploadExtend: {
    id: "uploadExtend",
    label: "上传并扩展",
    description: "从指定秒数续写，拉长音轨",
    confirmDetail: "从您上传的音频指定秒数处开始续写，保留原风格和人声特点，生成更长的音轨。适用于拉长现有歌曲、demo 扩展等场景。需提供完整音频（可来自版本「转为 uploadUrl」或粘贴公网链接）。",
    inputCount: 1,
    inputHint: "完整音频",
  },
  addVocals: {
    id: "addVocals",
    label: "添加人声",
    description: "在纯伴奏上生成人声",
    confirmDetail: "在纯伴奏上由 AI 生成人声，适合卡拉OK 伴奏填词、demo 创作、topline 制作等。需提供纯伴奏（可先做人声分离得到伴奏，再「转为 uploadUrl」；或直接上传伴奏）。",
    inputCount: 1,
    inputHint: "伴奏（可做人声分离获取）",
  },
  addInstrumental: {
    id: "addInstrumental",
    label: "添加伴奏",
    description: "为人声或旋律生成伴奏",
    confirmDetail: "为人声或旋律轨生成伴奏，适合歌手、词曲作者快速出 demo，或为人声干声配乐。需提供纯人声（可先做人声分离得到人声，再「转为 uploadUrl」；或直接上传人声）。",
    inputCount: 1,
    inputHint: "人声（可做人声分离获取）",
  },
  mashup: {
    id: "mashup",
    label: "生成混音",
    description: "将两首音频混合创作",
    confirmDetail: "将两首音频混合创作成新曲，融合风格、旋律和节奏。需提供 2 个公网可访问的音频链接。可分别粘贴链接并点击「获取」后使用。",
    inputCount: 2,
    inputHint: "2 个音频",
  },
};
