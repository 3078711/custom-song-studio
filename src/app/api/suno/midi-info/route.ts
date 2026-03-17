import { NextRequest, NextResponse } from "next/server";
import { sunoGetMidiGenerationInfo } from "@/lib/suno";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId 不能为空" }, { status: 400 });
    }
    const info = await sunoGetMidiGenerationInfo(taskId);
    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取 MIDI 详情失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
