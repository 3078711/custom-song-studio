import { NextRequest, NextResponse } from "next/server";
import { sunoUploadFromUrl } from "@/lib/sunoUpload";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_URL: "请输入有效的 http 或 https 链接",
  URL_UNREACHABLE: "无法访问该链接，请确认可公网访问且非网易云、QQ 音乐等平台链接",
  TIMEOUT: "链接响应超时，请稍后重试",
  NOT_AUDIO: "该链接不是音频文件，请提供 .mp3、.wav 等音频直链",
  FILE_TOO_LARGE: "文件超过 100MB，请使用本地上传",
  "SUNO_API_KEY 未配置": "服务未配置，请联系管理员",
};

function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str.trim());
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

/** 从公网 URL 拉取音频并转为 Suno 可用的 fileUrl */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileUrl } = body;

    if (!fileUrl || typeof fileUrl !== "string") {
      return NextResponse.json(
        { error: "INVALID_URL", message: ERROR_MESSAGES.INVALID_URL },
        { status: 400 }
      );
    }

    const url = fileUrl.trim();
    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "INVALID_URL", message: ERROR_MESSAGES.INVALID_URL },
        { status: 400 }
      );
    }

    const result = await sunoUploadFromUrl({
      fileUrl: url,
      uploadPath: "audio/reference",
    });

    return NextResponse.json({
      fileUrl: result.fileUrl,
      downloadUrl: result.downloadUrl,
      fileName: result.fileName,
      expiresIn: "3天",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "服务暂时不可用，请稍后重试";
    const userMessage = ERROR_MESSAGES[msg] || (msg.startsWith("SUNO") ? msg : "服务暂时不可用，请稍后重试");
    return NextResponse.json(
      { error: msg, message: userMessage },
      { status: 400 }
    );
  }
}
