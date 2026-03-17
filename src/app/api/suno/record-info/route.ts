import { NextRequest, NextResponse } from "next/server";
import { sunoGetRecordInfo } from "@/lib/suno";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json(
      { error: "缺少 taskId 参数" },
      { status: 400 }
    );
  }

  try {
    const info = await sunoGetRecordInfo(taskId);
    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "查询失败";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
