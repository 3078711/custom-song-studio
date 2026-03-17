import { NextRequest, NextResponse } from "next/server";
import { sunoUploadCover } from "@/lib/suno";

/** 上传并翻唱：传入 uploadUrl（由 /api/suno/upload-audio 获取） */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uploadUrl,
      prompt,
      style,
      title,
      model,
      customMode,
      instrumental,
      personaId,
    } = body;

    if (!uploadUrl || !prompt) {
      return NextResponse.json(
        { error: "缺少 uploadUrl 或 prompt" },
        { status: 400 }
      );
    }

    const taskId = await sunoUploadCover({
      uploadUrl,
      prompt,
      style,
      title,
      model,
      customMode,
      instrumental,
      personaId,
    });
    return NextResponse.json({ taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "翻唱请求失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
