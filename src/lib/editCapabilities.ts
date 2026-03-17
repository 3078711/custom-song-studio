/**
 * 深度编辑能力注册表
 * 便于新增能力，参数驱动
 */

export const EDIT_CAPABILITY_IDS = [
  "extend",
  "replace",
  "separate",
  "persona",
  "musicVideo",
] as const;

export type EditCapabilityId = (typeof EDIT_CAPABILITY_IDS)[number];

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
}

export const EDIT_CAPABILITIES: Record<EditCapabilityId, EditCapabilityDef> = {
  extend: {
    id: "extend",
    label: "延长音乐",
    description: "从末尾续写，保留原风格，生成更长音轨",
    confirmDetail: "将从当前歌曲末尾续写，自动沿用原风格、人声和歌词结构，生成更长的音轨。模型版本会与源音乐保持一致。完成后会创建新版本。",
    needsSunoIds: true,
    async: true,
  },
  replace: {
    id: "replace",
    label: "替换分区",
    description: "选择时间区间，用新内容替换该段落",
    confirmDetail: "选择 6–60 秒的时间区间，用新的音乐内容替换该段落。需填写替换描述、风格标签和标题。完成后会创建新版本。",
    needsSunoIds: true,
    async: true,
  },
  separate: {
    id: "separate",
    label: "人声分离",
    description: "分离人声与伴奏，可导出卡拉OK 伴奏",
    confirmDetail: "将当前歌曲分离为人声轨和伴奏轨，可导出纯人声或纯伴奏（卡拉OK 伴奏）。完成后可在编辑任务记录中查看人声和伴奏链接。",
    needsSunoIds: true,
    async: true,
  },
  persona: {
    id: "persona",
    label: "生成 Persona",
    description: "基于此人声创建固定风格，用于后续生成",
    confirmDetail: "基于当前歌曲的人声特点创建 Persona，后续生成新歌时可选用此人声风格。需填写名称和风格描述，完成后会返回 personaId 供后续使用。",
    needsSunoIds: true,
    async: false,
  },
  musicVideo: {
    id: "musicVideo",
    label: "创建音乐视频",
    description: "为音轨生成 MP4 可视化视频，适合小样展示",
    confirmDetail: "将为当前歌曲生成带可视化效果的 MP4 视频，与音乐同步，适合发给客户做小样展示或社交媒体分享。视频保留 15 天。",
    needsSunoIds: true,
    async: true,
  },
};

export function getEditCapability(id: string): EditCapabilityDef | undefined {
  return EDIT_CAPABILITIES[id as EditCapabilityId];
}
