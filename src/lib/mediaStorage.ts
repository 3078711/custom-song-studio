/**
 * 媒体文件持久化存储
 * 解决 Suno API 14-15 天后清除媒体文件的问题
 * 参考：https://docs.sunoapi.org/cn
 */

import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const STORAGE_ROOT =
  process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), "storage");
const AUDIO_DIR = path.join(STORAGE_ROOT, "audio");
const COVER_DIR = path.join(STORAGE_ROOT, "covers");

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/** 从 URL 推断扩展名 */
function getExtFromUrl(url: string, type: "audio" | "cover"): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(mp3|wav|jpg|jpeg|png|webp)$/i);
    if (match) return match[1].toLowerCase().replace("jpeg", "jpg");
  } catch {
    /* ignore */
  }
  return type === "audio" ? "mp3" : "jpg";
}

/** 从 URL 下载文件并保存到本地 */
export async function downloadAndSave(
  url: string,
  type: "audio" | "cover",
  id: string
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = getExtFromUrl(url, type);
    const dir = type === "audio" ? AUDIO_DIR : COVER_DIR;
    await ensureDir(dir);
    const filename = `${id}.${ext}`;
    const filepath = path.join(dir, filename);
    await writeFile(filepath, buffer);
    return filename;
  } catch {
    return null;
  }
}

/** 获取存储文件的完整路径 */
export function getStoragePath(type: "audio" | "cover", filename: string): string {
  const dir = type === "audio" ? AUDIO_DIR : COVER_DIR;
  return path.join(dir, filename);
}

/** 检查文件是否存在 */
export function fileExists(type: "audio" | "cover", filename: string): boolean {
  return existsSync(getStoragePath(type, filename));
}

/** 读取文件内容 */
export async function readStoredFile(
  type: "audio" | "cover",
  filename: string
): Promise<Buffer | null> {
  const filepath = getStoragePath(type, filename);
  if (!existsSync(filepath)) return null;
  return readFile(filepath);
}
