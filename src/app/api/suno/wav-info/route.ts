import { NextRequest, NextResponse } from "next/server";
import { sunoGetWavConversionInfo } from "@/lib/suno";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId 不能为空" }, { status: 400 });
    }
    const info = await sunoGetWavConversionInfo(taskId);
    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取 WAV 详情失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
