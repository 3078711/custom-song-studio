import { NextRequest, NextResponse } from "next/server";
import { sunoGenerate } from "@/lib/suno";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const taskId = await sunoGenerate({
      prompt: body.prompt || "",
      style: body.style || "",
      title: body.title || "未命名",
      model: body.model || "V4_5ALL",
      instrumental: !!body.instrumental,
      customMode: !!body.customMode,
      negativeTags: body.negativeTags,
      vocalGender: ["m", "f"].includes(body.vocalGender)
        ? body.vocalGender
        : undefined,
      styleWeight: body.styleWeight,
      weirdnessConstraint: body.weirdnessConstraint,
    });

    return NextResponse.json({ taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "生成请求失败";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
