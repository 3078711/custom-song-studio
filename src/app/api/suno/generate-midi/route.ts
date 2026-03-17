import { NextRequest, NextResponse } from "next/server";
import { sunoGenerateMidi } from "@/lib/suno";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, audioId } = body;
    if (!taskId) {
      return NextResponse.json({ error: "taskId 不能为空（需为人声分离 split_stem 任务 ID）" }, { status: 400 });
    }
    const midiTaskId = await sunoGenerateMidi({ taskId, audioId });
    return NextResponse.json({ taskId: midiTaskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "MIDI 生成失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
