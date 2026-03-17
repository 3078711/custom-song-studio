/**
 * Suno File Upload API 封装
 * 参考：https://docs.sunoapi.org/file-upload-api/quickstart
 * 文件保留 3 天，返回的 URL 可用于 upload-cover、add-vocals 等
 */

const UPLOAD_BASE =
  process.env.SUNO_FILE_UPLOAD_BASE_URL || "https://sunoapiorg.redpandaai.co";
const SUNO_KEY = process.env.SUNO_API_KEY;

export interface SunoUploadResult {
  fileUrl: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt?: string;
}

/** Base64 上传（适合 ≤10MB 的音频） */
export async function sunoUploadBase64(params: {
  base64Data: string;
  uploadPath?: string;
  fileName?: string;
}): Promise<SunoUploadResult> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  const body = {
    base64Data: params.base64Data,
    uploadPath: params.uploadPath || "audio/reference",
    fileName: params.fileName,
  };
  const res = await fetch(`${UPLOAD_BASE}/api/file-base64-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success && json.code !== 200) {
    throw new Error(json.msg || "文件上传失败");
  }
  const d = json.data;
  const url = d?.downloadUrl || d?.fileUrl;
  if (!url) throw new Error("上传成功但未返回文件 URL");
  return {
    fileUrl: url,
    downloadUrl: url,
    fileName: d?.fileName || params.fileName || "audio",
    fileSize: d?.fileSize || 0,
    mimeType: d?.mimeType || "audio/mpeg",
    expiresAt: d?.expiresAt,
  };
}

/** URL 上传：从公网拉取音频并转为临时 fileUrl（Suno /api/file-url-upload） */
export async function sunoUploadFromUrl(params: {
  fileUrl: string;
  uploadPath?: string;
  fileName?: string;
}): Promise<SunoUploadResult> {
  if (!SUNO_KEY) throw new Error("SUNO_API_KEY 未配置");
  const body = {
    fileUrl: params.fileUrl.trim(),
    uploadPath: params.uploadPath || "audio/reference",
    fileName: params.fileName,
  };
  const res = await fetch(`${UPLOAD_BASE}/api/file-url-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success && json.code !== 200) {
    const msg = json.msg || "链接上传失败";
    if (msg.includes("timeout") || msg.includes("超时")) throw new Error("TIMEOUT");
    if (msg.includes("100") || msg.includes("MB") || msg.includes("size")) throw new Error("FILE_TOO_LARGE");
    throw new Error(msg);
  }
  const d = json.data;
  const url = d?.downloadUrl || d?.fileUrl;
  if (!url) throw new Error("上传成功但未返回文件 URL");
  return {
    fileUrl: url,
    downloadUrl: url,
    fileName: d?.fileName || params.fileName || "audio",
    fileSize: d?.fileSize || 0,
    mimeType: d?.mimeType || "audio/mpeg",
    expiresAt: d?.expiresAt,
  };
}
