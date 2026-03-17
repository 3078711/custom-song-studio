import { NextRequest, NextResponse } from "next/server";
import { readStoredFile, fileExists } from "@/lib/mediaStorage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; filename: string }> }
) {
  const { type, filename } = await params;
  if (type !== "audio" && type !== "cover") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!filename || !/^[a-zA-Z0-9_.-]+\.(mp3|wav|jpg|jpeg|png|webp)$/i.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  if (!fileExists(type as "audio" | "cover", filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readStoredFile(type as "audio" | "cover", filename);
  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType =
    type === "audio"
      ? (filename.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg")
      : filename.toLowerCase().endsWith(".png")
        ? "image/png"
        : filename.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
