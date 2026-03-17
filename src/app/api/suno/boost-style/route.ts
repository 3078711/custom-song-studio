import { NextRequest, NextResponse } from "next/server";
import { sunoBoostMusicStyle } from "@/lib/suno";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "content 不能为空" }, { status: 400 });
    }
    const result = await sunoBoostMusicStyle(content);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "风格增强失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
