import { NextRequest, NextResponse } from "next/server";
import { sunoUploadBase64 } from "@/lib/sunoUpload";

/** 接受 base64 或 multipart 音频，上传到 Suno 获取 fileUrl */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let base64Data: string;
    let fileName = "audio";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      base64Data = body.base64Data;
      fileName = body.fileName || "reference.mp3";
      if (!base64Data) {
        return NextResponse.json(
          { error: "缺少 base64Data" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "缺少 file 字段" },
          { status: 400 }
        );
      }
      const buf = await file.arrayBuffer();
      base64Data = `data:${file.type};base64,${Buffer.from(buf).toString("base64")}`;
      fileName = file.name || "audio.mp3";
    } else {
      return NextResponse.json(
        { error: "请使用 application/json 或 multipart/form-data" },
        { status: 400 }
      );
    }

    const result = await sunoUploadBase64({
      base64Data,
      uploadPath: "audio/reference",
      fileName,
    });
    return NextResponse.json({
      fileUrl: result.fileUrl,
      downloadUrl: result.downloadUrl,
      fileName: result.fileName,
      expiresIn: "3天",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
