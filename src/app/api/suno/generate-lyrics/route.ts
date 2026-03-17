import { NextRequest, NextResponse } from "next/server";
import { sunoGenerateLyrics } from "@/lib/suno";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim() ?? "";
    if (!prompt) {
      return NextResponse.json({ error: "prompt 不能为空" }, { status: 400 });
    }
    const taskId = await sunoGenerateLyrics(prompt);
    return NextResponse.json({ taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "歌词生成失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
