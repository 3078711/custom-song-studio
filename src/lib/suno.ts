/**
 * Suno API 封装
 * 参考：https://docs.sunoapi.org/cn
 * 限制：每 10 秒最多 20 次请求；错误码 430 表示调用频率过高
 */

/** 将 Suno 版权检测英文错误转为友好中文提示（用于 record-info 等异步返回的错误） */
export function normalizeCopyrightError(message: string): string {
  if (!message || typeof message !== "string") return message;
  if (/matches existing work|existing work of art/i.test(message)) {
    return "检测到参考曲与已有版权作品相似，无法使用。请使用原创或自录音频。";
  }
  return message;
}

const SUNO_BASE = process.env.SUNO_API_BASE_URL || "https://api.sunoapi.org";
const SUNO_KEY = process.env.SUNO_API_KEY;

/** 速率限制：每 10 秒最多 20 次请求 */
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 20;
const timestamps: number[] = [];

function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_LIMIT_MAX) {
    const waitMs = timestamps[0]! + RATE_LIMIT_WINDOW_MS - now + 100;
    return new Promise((r) => setTimeout(r, Math.max(waitMs, 500)));
  }
  timestamps.push(now);
  return Promise.resolve();
}

export interface SunoGenerateParams {
  prompt: string;
  style: string;
  title: string;
  model: string;
  instrumental: boolean;
  customMode: boolean;
  negativeTags?: string;
  vocalGender?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
}

export interface SunoAudioItem {
  id: string;
  audio_url: string;
  image_url?: string;
  title?: string;
  duration?: number;
  prompt?: string;
}

export interface SunoRecordInfo {
  taskId: string;
  status: "PENDING" | "GENERATING" | "SUCCESS" | "FAILED";
  response?: {
    data: SunoAudioItem[];
  };
  errorMessage?: string;
}

export async function sunoGenerate(params: SunoGenerateParams): Promise<string> {
  if (!SUNO_KEY) {
    throw new Error("SUNO_API_KEY 未配置，请在 .env.local 中设置");
  }

  await waitForRateLimit();

  const instrumental = !!params.instrumental;
  /** 有人声时必须走 customMode，否则不会发送 style/title，曲风/标题与歌词字段易错位 */
  const customMode = !instrumental ? true : !!params.customMode;

  const body: Record<string, unknown> = {
    customMode,
    instrumental,
    model: params.model,
    callBackUrl:
      process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };

  if (customMode) {
    body.style = params.style;
    body.title = params.title;
    if (!instrumental) {
      body.prompt = params.prompt;
    }
  } else {
    body.prompt = params.prompt;
  }

  if (params.negativeTags?.trim()) {
    body.negativeTags = params.negativeTags.trim();
  }
  if (params.vocalGender && ["m", "f"].includes(params.vocalGender)) {
    body.vocalGender = params.vocalGender;
  }
  if (params.styleWeight != null) {
    body.styleWeight = params.styleWeight;
  }
  if (params.weirdnessConstraint != null) {
    body.weirdnessConstraint = params.weirdnessConstraint;
  }

  const res = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (json.code !== 200) {
    if (json.code === 430) {
      throw new Error("调用频率过高，请稍后再试（每 10 秒最多 20 次请求）");
    }
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }

  const taskId = json.data?.taskId;
  if (!taskId) {
    throw new Error("Suno API 未返回 taskId");
  }

  return taskId;
}

export async function sunoGetRecordInfo(taskId: string): Promise<SunoRecordInfo> {
  if (!SUNO_KEY) {
    throw new Error("SUNO_API_KEY 未配置");
  }

  await waitForRateLimit();

  const res = await fetch(
    `${SUNO_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${SUNO_KEY}`,
      },
    }
  );

  const json = await res.json();

  if (json.code !== 200) {
    if (json.code === 430) {
      throw new Error("调用频率过高，请稍后再试（每 10 秒最多 20 次请求）");
    }
    const msg = json.msg || json.message || json.error || `Suno API 错误: ${json.code}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const data = json.data;
  const raw = data.response;
  const items = (Array.isArray(raw) ? raw : null) ?? raw?.sunoData ?? raw?.data ?? [];
  const getPrompt = (item: Record<string, unknown>): string | undefined => {
    const v =
      item.prompt ??
      item.lyrics ??
      item.generated_lyrics ??
      item.prompt_text ??
      item.text;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const normalized: SunoAudioItem[] = Array.isArray(items)
    ? items
        .map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ""),
          audio_url: String(item.audioUrl ?? item.audio_url ?? ""),
          image_url: (item.imageUrl ?? item.image_url) as string | undefined,
          title: item.title as string | undefined,
          duration: item.duration as number | undefined,
          prompt: getPrompt(item),
        }))
        .filter((x) => x.audio_url)
    : [];

  return {
    taskId: data.taskId || taskId,
    status: data.status || "PENDING",
    response: { data: normalized },
    errorMessage: data.errorMessage ? normalizeCopyrightError(String(data.errorMessage)) : undefined,
  };
}

// ========== 深度编辑 API ==========

/** 延长音乐：从末尾续写，保留原风格 */
export async function sunoExtend(params: {
  audioId: string;
  model: string;
  defaultParamFlag?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    audioId: params.audioId,
    model: params.model || "V4_5ALL",
    defaultParamFlag: params.defaultParamFlag ?? false,
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (params.defaultParamFlag && params.prompt && params.style && params.title != null && params.continueAt != null) {
    body.prompt = params.prompt;
    body.style = params.style;
    body.title = params.title;
    body.continueAt = params.continueAt;
  }

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    const msg = json.msg || `Suno API 错误: ${json.code}`;
    if (typeof msg === "string" && /model/i.test(msg)) {
      throw new Error("模型版本与源音乐不一致，延长功能需使用与源音乐相同的模型。若源版本较旧，可尝试重新生成后再延长。");
    }
    throw new Error(msg);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

/** 替换音乐分区 */
export async function sunoReplaceSection(params: {
  taskId: string;
  audioId: string;
  prompt: string;
  tags: string;
  title: string;
  infillStartS: number;
  infillEndS: number;
  negativeTags?: string;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    taskId: params.taskId,
    audioId: params.audioId,
    prompt: params.prompt,
    tags: params.tags,
    title: params.title,
    infillStartS: params.infillStartS,
    infillEndS: params.infillEndS,
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (params.negativeTags?.trim()) body.negativeTags = params.negativeTags.trim();

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/replace-section`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

/** 人声与乐器分离 */
export async function sunoSeparateVocals(params: {
  taskId: string;
  audioId: string;
  type?: "separate_vocal" | "split_stem";
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body = {
    taskId: params.taskId,
    audioId: params.audioId,
    type: params.type || "separate_vocal",
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };

  const res = await fetch(`${SUNO_BASE}/api/v1/vocal-removal/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

export interface SunoVocalSeparationOriginItem {
  id: string;
  stem_type_group_name?: string;
  audio_url?: string;
  duration?: number;
}

export interface SunoVocalSeparationInfo {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION";
  vocalUrl?: string;
  instrumentalUrl?: string;
  /** split_stem 分轨结果，含各乐器 id 供 MIDI 生成使用 */
  originData?: SunoVocalSeparationOriginItem[];
  drumsUrl?: string;
  bassUrl?: string;
  guitarUrl?: string;
  keyboardUrl?: string;
  stringsUrl?: string;
  synthUrl?: string;
  percussionUrl?: string;
  brassUrl?: string;
  woodwindsUrl?: string;
  fxUrl?: string;
  backingVocalsUrl?: string;
  errorMessage?: string;
}

/** 获取人声分离任务详情 */
export async function sunoGetVocalSeparationInfo(taskId: string): Promise<SunoVocalSeparationInfo> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(
    `${SUNO_BASE}/api/v1/vocal-removal/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${SUNO_KEY}` },
    }
  );
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }

  const data = json.data ?? {};
  const resp = data.response ?? {};
  const status = (data.successFlag ?? "PENDING") as SunoVocalSeparationInfo["status"];
  const originData = (resp.originData ?? []) as SunoVocalSeparationOriginItem[];

  const result: SunoVocalSeparationInfo = {
    taskId: data.taskId || taskId,
    status,
    vocalUrl: resp.vocalUrl ?? resp.vocal_url,
    instrumentalUrl: resp.instrumentalUrl ?? resp.instrumental_url,
    originData: originData.length ? originData : undefined,
    errorMessage: data.errorMessage,
  };
  if (resp.drumsUrl) result.drumsUrl = resp.drumsUrl;
  if (resp.bassUrl) result.bassUrl = resp.bassUrl;
  if (resp.guitarUrl) result.guitarUrl = resp.guitarUrl;
  if (resp.keyboardUrl) result.keyboardUrl = resp.keyboardUrl;
  if (resp.stringsUrl) result.stringsUrl = resp.stringsUrl;
  if (resp.synthUrl) result.synthUrl = resp.synthUrl;
  if (resp.percussionUrl) result.percussionUrl = resp.percussionUrl;
  if (resp.brassUrl) result.brassUrl = resp.brassUrl;
  if (resp.woodwindsUrl) result.woodwindsUrl = resp.woodwindsUrl;
  if (resp.fxUrl) result.fxUrl = resp.fxUrl;
  if (resp.backingVocalsUrl) result.backingVocalsUrl = resp.backingVocalsUrl;
  return result;
}

/** 创建音乐视频：为音轨生成 MP4 可视化视频 */
export async function sunoCreateMusicVideo(params: {
  taskId: string;
  audioId: string;
  author?: string;
  domainName?: string;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    taskId: params.taskId,
    audioId: params.audioId,
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (params.author?.trim()) body.author = params.author.trim().slice(0, 50);
  if (params.domainName?.trim()) body.domainName = params.domainName.trim().slice(0, 50);

  const res = await fetch(`${SUNO_BASE}/api/v1/mp4/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

export interface SunoMusicVideoInfo {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_MP4_FAILED" | "CALLBACK_EXCEPTION";
  videoUrl?: string;
  errorMessage?: string;
}

/** 获取音乐视频生成任务详情 */
export async function sunoGetMusicVideoInfo(taskId: string): Promise<SunoMusicVideoInfo> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(
    `${SUNO_BASE}/api/v1/mp4/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${SUNO_KEY}` } }
  );
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }

  const data = json.data ?? {};
  const resp = data.response ?? {};
  const status = (data.successFlag ?? "PENDING") as SunoMusicVideoInfo["status"];

  return {
    taskId: data.taskId || taskId,
    status,
    videoUrl: resp.videoUrl ?? resp.video_url,
    errorMessage: data.errorMessage,
  };
}

/** 生成 Persona（同步返回 personaId） */
export async function sunoGeneratePersona(params: {
  taskId: string;
  audioId: string;
  name: string;
  description: string;
  style?: string;
  vocalStart?: number;
  vocalEnd?: number;
}): Promise<{ personaId: string; name: string; description: string }> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    taskId: params.taskId,
    audioId: params.audioId,
    name: params.name,
    description: params.description,
  };
  if (params.style?.trim()) body.style = params.style;
  if (params.vocalStart != null) body.vocalStart = params.vocalStart;
  if (params.vocalEnd != null) body.vocalEnd = params.vocalEnd;

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/generate-persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const d = json.data;
  if (!d?.personaId) throw new Error("Suno API 未返回 personaId");
  return {
    personaId: d.personaId,
    name: d.name || params.name,
    description: d.description || params.description,
  };
}

const UPLOAD_COVER_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/** 是否可重试的错误：500/502/503 或网络异常，413/430 不重试 */
function isRetryableUploadCoverError(
  status: number,
  code?: number
): boolean {
  if (code === 413 || code === 430 || status === 413) return false;
  return status >= 500 || status === 0 || code === 500;
}

/** 上传并翻唱：保留旋律换风格，需 uploadUrl（通过 File Upload API 获取） */
export async function sunoUploadCover(params: {
  uploadUrl: string;
  prompt: string;
  style?: string;
  title?: string;
  model?: string;
  customMode?: boolean;
  instrumental?: boolean;
  personaId?: string;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const customMode = params.customMode ?? true;
  const instrumental = params.instrumental ?? false;
  const body: Record<string, unknown> = {
    uploadUrl: params.uploadUrl,
    customMode,
    instrumental,
    model: params.model || "V4_5ALL",
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (customMode) {
    body.style = params.style || "流行";
    body.title = params.title || "翻唱";
    if (!instrumental) body.prompt = params.prompt;
  } else {
    body.prompt = params.prompt;
  }
  if (params.personaId) body.personaId = params.personaId;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= UPLOAD_COVER_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${SUNO_BASE}/api/v1/generate/upload-cover`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUNO_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let json: { code?: number; msg?: string; message?: string; error?: string; data?: { taskId?: string } };
      try {
        json = await res.json();
      } catch {
        if (res.status === 413) {
          throw new Error("检测到参考曲与已有版权作品相似，无法使用。请使用原创或自录音频。");
        }
        if (attempt < UPLOAD_COVER_MAX_RETRIES && isRetryableUploadCoverError(res.status)) {
          lastErr = new Error(`请求失败 (HTTP ${res.status})`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
        throw new Error(`请求失败 (HTTP ${res.status})`);
      }

      const raw = json.msg ?? json.message ?? json.error ?? `Suno API 错误: ${json.code ?? res.status}`;
      const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
      const is413 = json.code === 413 || res.status === 413;
      if (is413 && /matches existing work|existing work of art/i.test(msg)) {
        throw new Error("检测到参考曲与已有版权作品相似，无法使用。请使用原创或自录音频。");
      }
      if (json.code !== 200) {
        if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
        if (attempt < UPLOAD_COVER_MAX_RETRIES && isRetryableUploadCoverError(res.status, json.code)) {
          lastErr = new Error(msg);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
        throw new Error(msg);
      }
      const taskId = json.data?.taskId;
      if (!taskId) throw new Error("Suno API 未返回 taskId");
      return taskId;
    } catch (e) {
      if (e instanceof Error && /版权|413|430/.test(e.message)) throw e;
      if (e instanceof Error && attempt < UPLOAD_COVER_MAX_RETRIES) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("翻唱请求失败");
}

// ========== Phase 4: 基于上传的能力 ==========

/** 上传并扩展：从指定秒数续写，保留原风格 */
export async function sunoUploadExtend(params: {
  uploadUrl: string;
  model?: string;
  defaultParamFlag?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  instrumental?: boolean;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const defaultParamFlag = params.defaultParamFlag ?? false;
  const instrumental = params.instrumental ?? false;
  const body: Record<string, unknown> = {
    uploadUrl: params.uploadUrl,
    defaultParamFlag,
    model: params.model || "V4_5ALL",
    instrumental,
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (defaultParamFlag) {
    body.style = params.style || "流行";
    body.title = params.title || "扩展";
    if (!instrumental) body.prompt = params.prompt || "延续原风格";
    body.continueAt = params.continueAt ?? 30;
  }

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/upload-extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

/** 添加人声：在伴奏上生成人声 */
export async function sunoAddVocals(params: {
  uploadUrl: string;
  prompt: string;
  style: string;
  title: string;
  negativeTags?: string;
  model?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    uploadUrl: params.uploadUrl,
    prompt: params.prompt.trim(),
    style: params.style.trim() || "流行",
    title: params.title.trim() || "添加人声",
    negativeTags: params.negativeTags?.trim() || "无",
    model: params.model || "V4_5PLUS",
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (params.vocalGender && ["m", "f"].includes(params.vocalGender)) body.vocalGender = params.vocalGender;
  if (params.styleWeight != null) body.styleWeight = params.styleWeight;
  if (params.weirdnessConstraint != null) body.weirdnessConstraint = params.weirdnessConstraint;
  if (params.audioWeight != null) body.audioWeight = params.audioWeight;

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/add-vocals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

/** 添加伴奏：为人声生成伴奏 */
export async function sunoAddInstrumental(params: {
  uploadUrl: string;
  tags: string;
  title: string;
  negativeTags?: string;
  model?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    uploadUrl: params.uploadUrl,
    tags: params.tags.trim() || "流行",
    title: params.title.trim() || "添加伴奏",
    negativeTags: params.negativeTags?.trim() || "无",
    model: params.model || "V4_5PLUS",
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (params.vocalGender && ["m", "f"].includes(params.vocalGender)) body.vocalGender = params.vocalGender;
  if (params.styleWeight != null) body.styleWeight = params.styleWeight;
  if (params.weirdnessConstraint != null) body.weirdnessConstraint = params.weirdnessConstraint;
  if (params.audioWeight != null) body.audioWeight = params.audioWeight;

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/add-instrumental`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

/** 生成混音：将两首音频混合 */
export async function sunoGenerateMashup(params: {
  uploadUrlList: [string, string];
  customMode?: boolean;
  instrumental?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  model?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const customMode = params.customMode ?? true;
  const instrumental = params.instrumental ?? false;
  const body: Record<string, unknown> = {
    uploadUrlList: params.uploadUrlList,
    customMode,
    instrumental,
    model: params.model || "V4_5ALL",
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (customMode) {
    body.style = params.style || "流行";
    body.title = params.title || "混音";
    if (!instrumental) body.prompt = params.prompt || "两首歌曲的创意混音";
  } else {
    body.prompt = params.prompt || "两首歌曲的创意混音";
  }
  if (params.vocalGender && ["m", "f"].includes(params.vocalGender)) body.vocalGender = params.vocalGender;
  if (params.styleWeight != null) body.styleWeight = params.styleWeight;
  if (params.weirdnessConstraint != null) body.weirdnessConstraint = params.weirdnessConstraint;
  if (params.audioWeight != null) body.audioWeight = params.audioWeight;

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/mashup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `Suno API 错误: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

/** 获取带时间戳的歌词（实际演唱内容），用于展示改编后的歌词 */
export async function sunoGetTimestampedLyrics(
  taskId: string,
  audioId: string
): Promise<string | null> {
  if (!SUNO_KEY) return null;

  await waitForRateLimit();

  const res = await fetch(`${SUNO_BASE}/api/v1/generate/get-timestamped-lyrics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ taskId, audioId }),
  });

  const json = await res.json();
  if (json.code !== 200 || !json.data?.alignedWords) return null;

  const words = json.data.alignedWords as Array<{ word?: string }>;
  const parts = words.map((w) => (w.word ?? "").trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" ").replace(/\s+(\[[\w\s]+\])/g, "\n$1").trim();
}

// ========== Phase 1: 风格增强 + AI 歌词生成 ==========

/** 风格增强：将用户描述优化为更专业的 prompt（同步返回） */
export async function sunoBoostMusicStyle(content: string): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(`${SUNO_BASE}/api/v1/style/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: content.trim() }),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `风格增强失败: ${json.code}`);
  }
  const d = json.data;
  const flag = d?.successFlag;
  if (flag === "2" || flag === 2) throw new Error(d?.errorMessage || "风格增强失败");
  return (d?.result ?? content).trim() || content;
}

/** 生成歌词：异步任务，返回 taskId */
export async function sunoGenerateLyrics(prompt: string): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(`${SUNO_BASE}/api/v1/lyrics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt.trim().slice(0, 200),
      callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
    }),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `歌词生成失败: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

export interface SunoLyricsGenerationInfo {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_LYRICS_FAILED" | "CALLBACK_EXCEPTION" | "SENSITIVE_WORD_ERROR";
  items?: Array<{ text: string; title: string; status: string }>;
}

/** 获取歌词生成详情（轮询用） */
export async function sunoGetLyricsGenerationInfo(taskId: string): Promise<SunoLyricsGenerationInfo> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(
    `${SUNO_BASE}/api/v1/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${SUNO_KEY}` } }
  );
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `获取歌词详情失败: ${json.code}`);
  }
  const d = json.data ?? {};
  const resp = d.response ?? {};
  const items = (resp.data ?? []) as Array<{ text?: string; title?: string; status?: string }>;
  return {
    taskId: d.taskId || taskId,
    status: (d.status ?? "PENDING") as SunoLyricsGenerationInfo["status"],
    items: items.map((x) => ({ text: x.text ?? "", title: x.title ?? "", status: x.status ?? "" })),
  };
}

// ========== Phase 2: WAV 转换 + 生成 MIDI ==========

/** 转换为 WAV 格式：异步任务，需 taskId + audioId */
export async function sunoConvertToWav(params: {
  taskId: string;
  audioId: string;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(`${SUNO_BASE}/api/v1/wav/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      taskId: params.taskId,
      audioId: params.audioId,
      callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
    }),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `WAV 转换失败: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

export interface SunoWavConversionInfo {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_WAV_FAILED" | "CALLBACK_EXCEPTION";
  audioWavUrl?: string;
}

/** 获取 WAV 转换详情（轮询用） */
export async function sunoGetWavConversionInfo(taskId: string): Promise<SunoWavConversionInfo> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(
    `${SUNO_BASE}/api/v1/wav/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${SUNO_KEY}` } }
  );
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `获取 WAV 详情失败: ${json.code}`);
  }
  const d = json.data ?? {};
  const resp = d.response ?? {};
  const status = (d.successFlag ?? resp.successFlag ?? "PENDING") as SunoWavConversionInfo["status"];
  return {
    taskId: d.taskId || taskId,
    status,
    audioWavUrl: resp.audioWavUrl ?? resp.audio_wav_url,
  };
}

/** 生成 MIDI：需人声分离任务（split_stem）的 taskId */
export async function sunoGenerateMidi(params: {
  taskId: string;
  audioId?: string;
}): Promise<string> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const body: Record<string, unknown> = {
    taskId: params.taskId,
    callBackUrl: process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback",
  };
  if (params.audioId) body.audioId = params.audioId;

  const res = await fetch(`${SUNO_BASE}/api/v1/midi/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `MIDI 生成失败: ${json.code}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("Suno API 未返回 taskId");
  return taskId;
}

export interface SunoMidiNote {
  pitch: number;
  start: number;
  end: number;
  velocity: number;
}

export interface SunoMidiInstrument {
  name: string;
  notes: SunoMidiNote[];
}

export interface SunoMidiGenerationInfo {
  taskId: string;
  /** successFlag: 0=PENDING, 1=SUCCESS, 2=CREATE_FAILED, 3=GENERATE_FAILED */
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_MIDI_FAILED" | "CALLBACK_EXCEPTION";
  midiData?: { state?: string; instruments?: SunoMidiInstrument[] };
  midiUrl?: string;
  errorMessage?: string;
}

/** 获取 MIDI 生成详情（轮询用） */
export async function sunoGetMidiGenerationInfo(taskId: string): Promise<SunoMidiGenerationInfo> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  await waitForRateLimit();

  const res = await fetch(
    `${SUNO_BASE}/api/v1/midi/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${SUNO_KEY}` } }
  );
  const json = await res.json();
  if (json.code !== 200) {
    if (json.code === 430) throw new Error("调用频率过高，请稍后再试");
    throw new Error(json.msg || `获取 MIDI 详情失败: ${json.code}`);
  }
  const d = json.data ?? {};
  const flag = d.successFlag;
  let status: SunoMidiGenerationInfo["status"] = "PENDING";
  if (flag === 1) status = "SUCCESS";
  else if (flag === 2) status = "CREATE_TASK_FAILED";
  else if (flag === 3) status = "GENERATE_MIDI_FAILED";
  return {
    taskId: d.taskId || taskId,
    status,
    midiData: d.midiData,
    midiUrl: d.midiUrl ?? d.response?.midiUrl,
    errorMessage: d.errorMessage,
  };
}
