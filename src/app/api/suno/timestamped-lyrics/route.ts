import { NextRequest, NextResponse } from "next/server";
import { sunoGetTimestampedLyrics } from "@/lib/suno";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const taskId = body.taskId as string;
    const audioId = body.audioId as string;
    if (!taskId || !audioId) {
      return NextResponse.json(
        { error: "缺少 taskId 或 audioId" },
        { status: 400 }
      );
    }
    const lyrics = await sunoGetTimestampedLyrics(taskId, audioId);
    return NextResponse.json({ lyrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取歌词失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
