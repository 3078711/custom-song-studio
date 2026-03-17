/**
 * 浏览器端音频格式转换（FFmpeg.wasm）
 * 将 FLAC、OGG、M4A 等转为 MP3，确保 Suno API 兼容
 */

const SUPPORTED_DIRECT = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];
const SUPPORTED_EXTENSIONS = ["mp3", "mpeg", "wav"];

/** 判断是否需要转换（非 MP3/WAV 需转换） */
export function needsConversion(file: File): boolean {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext)) return false;
  if (SUPPORTED_DIRECT.includes(file.type)) return false;
  return true;
}

/** 获取转换后的文件名 */
function getOutputFileName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "") || "converted";
  return `${base}.mp3`;
}

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

/** 根据扩展名返回 FFmpeg -f 格式提示，帮助正确解析输入 */
function getFormatHint(ext: string): string | null {
  const map: Record<string, string> = {
    flac: "flac",
    ogg: "ogg",
    oga: "ogg",
    m4a: "mov",
    aac: "aac",
    wma: "asf",
  };
  return map[ext] ?? null;
}

/**
 * 将音频文件转为 MP3（浏览器端）
 * @param file 原始文件（FLAC、OGG、M4A 等）
 * @param onProgress 进度回调 0-100
 * @returns 转换后的 MP3 Blob
 */
export async function convertToMp3(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  const logs: string[] = [];
  ffmpeg.on("log", ({ message }) => {
    logs.push(message);
  });

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.round((progress || 0) * 100));
    });
  }

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
  } catch (loadErr) {
    const msg = loadErr instanceof Error ? loadErr.message : String(loadErr);
    throw new Error(`FFmpeg 加载失败：${msg}。请检查网络或尝试使用 MP3/WAV 格式直接上传。`);
  }

  const ext = (file.name.split(".").pop() || "audio").toLowerCase().replace(/[^a-z0-9]/g, "");
  const inputPath = ext ? `input.${ext}` : "input";
  const outputPath = "output.mp3";

  const fileData = new Uint8Array(await file.arrayBuffer());
  if (fileData.length === 0) {
    throw new Error("文件为空，无法转换");
  }
  await ffmpeg.writeFile(inputPath, fileData);

  const formatHint = getFormatHint(ext);
  const execArgs = [
    "-analyzeduration", "50M",
    "-probesize", "50M",
    ...(formatHint ? ["-f", formatHint] : []),
    "-i", inputPath,
    "-vn", "-c:a", "libmp3lame", "-b:a", "192k", "-y", outputPath,
  ];

  let exitCode: number;
  try {
    exitCode = await ffmpeg.exec(execArgs, 300000);
  } catch (execErr) {
    const msg = execErr instanceof Error ? execErr.message : String(execErr);
    const lastLogs = logs.slice(-3).join("; ");
    throw new Error(`音频转换失败：${msg}${lastLogs ? ` (${lastLogs})` : ""}。请尝试使用 MP3 或 WAV 格式。`);
  }

  if (exitCode !== 0) {
    const lastLogs = logs.slice(-5).join("; ");
    throw new Error(
      `音频转换失败 (exit: ${exitCode})${lastLogs ? `：${lastLogs}` : ""}。请尝试使用 MP3 或 WAV 格式。`
    );
  }

  const data = await ffmpeg.readFile(outputPath);
  const arr = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data as unknown as ArrayBuffer);
  const blob = new Blob([arr], { type: "audio/mpeg" });

  ffmpeg.terminate();

  return blob;
}

/**
 * 准备上传用的文件：如需转换则先转换，否则返回原文件
 */
export async function prepareAudioForUpload(
  file: File,
  onProgress?: (status: string, percent?: number) => void
): Promise<{ blob: Blob; fileName: string }> {
  if (!needsConversion(file)) {
    return { blob: file, fileName: file.name };
  }

  onProgress?.("正在转换为 MP3…", 0);
  const blob = await convertToMp3(file, (p) => onProgress?.("正在转换为 MP3…", p));
  const fileName = getOutputFileName(file);
  return { blob, fileName };
}
