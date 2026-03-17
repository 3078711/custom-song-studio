import { NextRequest, NextResponse } from "next/server";
import { sunoConvertToWav } from "@/lib/suno";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, audioId } = body;
    if (!taskId || !audioId) {
      return NextResponse.json(
        { error: "taskId 和 audioId 不能为空" },
        { status: 400 }
      );
    }
    const wavTaskId = await sunoConvertToWav({ taskId, audioId });
    return NextResponse.json({ taskId: wavTaskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "WAV 转换失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
