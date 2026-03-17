import { NextRequest, NextResponse } from "next/server";
import { readStoredFile, fileExists } from "@/lib/mediaStorage";
import { sunoUploadBase64, sunoUploadFromUrl } from "@/lib/sunoUpload";

/** 匹配 /api/media/audio/xxx.mp3 或含该路径的完整 URL */
const MEDIA_AUDIO_REGEX = /\/api\/media\/audio\/([a-zA-Z0-9_.-]+\.(mp3|wav))/i;

/**
 * 版本 → uploadUrl 转换（Phase 3 输入统一）
 * 支持：1) 本地 /api/media/audio/xxx 直接读存储 2) 公网 URL 走 file-url-upload
 * 本地或 localhost 场景下，Suno 无法拉取，故本地路径统一走 base64 代理上传
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl } = body;

    if (!audioUrl || typeof audioUrl !== "string") {
      return NextResponse.json(
        { error: "缺少 audioUrl" },
        { status: 400 }
      );
    }

    const url = audioUrl.trim();
    let uploadResult: { fileUrl: string; downloadUrl: string; fileName: string };

    // 1) 本地存储路径（含相对或绝对）：直接读取并 base64 上传（支持 localhost）
    const mediaMatch = url.match(MEDIA_AUDIO_REGEX);
    if (mediaMatch) {
      const filename = mediaMatch[1];
      if (!filename || !/^[a-zA-Z0-9_.-]+\.(mp3|wav)$/i.test(filename)) {
        return NextResponse.json(
          { error: "无效的音频路径" },
          { status: 400 }
        );
      }
      if (!fileExists("audio", filename)) {
        return NextResponse.json(
          { error: "音频文件不存在" },
          { status: 404 }
        );
      }
      const buffer = await readStoredFile("audio", filename);
      if (!buffer) {
        return NextResponse.json(
          { error: "读取音频失败" },
          { status: 500 }
        );
      }
      const mime = filename.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg";
      const base64 = `data:${mime};base64,${buffer.toString("base64")}`;
      uploadResult = await sunoUploadBase64({
        base64Data: base64,
        uploadPath: "audio/reference",
        fileName: filename,
      });
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // 2) 公网 URL：Suno 可直接拉取时用 file-url-upload
      try {
        uploadResult = await sunoUploadFromUrl({
          fileUrl: url,
          uploadPath: "audio/reference",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // 若 Suno 无法访问（如 localhost），回退为代理：服务端 fetch 后 base64 上传
        if (/timeout|无法|unreachable|fetch/i.test(msg) || msg.includes("localhost")) {
          const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
          if (!res.ok) {
            return NextResponse.json(
              { error: "无法获取音频，请确认链接可公网访问" },
              { status: 400 }
            );
          }
          const arrayBuffer = await res.arrayBuffer();
          const base64 = `data:${res.headers.get("content-type") || "audio/mpeg"};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
          uploadResult = await sunoUploadBase64({
            base64Data: base64,
            uploadPath: "audio/reference",
            fileName: "audio.mp3",
          });
        } else {
          throw e;
        }
      }
    } else {
      // 3) 相对路径：补全为绝对 URL 后 fetch
      const host = req.headers.get("host") || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const origin = `${proto}://${host}`;
      const fullUrl = url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) {
        return NextResponse.json(
          { error: "无法获取音频" },
          { status: 400 }
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      const base64 = `data:${res.headers.get("content-type") || "audio/mpeg"};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      uploadResult = await sunoUploadBase64({
        base64Data: base64,
        uploadPath: "audio/reference",
        fileName: "audio.mp3",
      });
    }

    return NextResponse.json({
      uploadUrl: uploadResult.fileUrl,
      fileUrl: uploadResult.fileUrl,
      downloadUrl: uploadResult.downloadUrl,
      fileName: uploadResult.fileName,
      expiresIn: "3天",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "转换失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
