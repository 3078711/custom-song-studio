import { NextRequest, NextResponse } from "next/server";
import { downloadAndSave } from "@/lib/mediaStorage";

/** 从 Suno 临时 URL 下载并持久化到本地，返回可长期访问的 URL */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items as Array<{ audioUrl?: string; imageUrl?: string }>;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items 数组不能为空" },
        { status: 400 }
      );
    }

    const results: Array<{ audioUrl?: string; coverUrl?: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = `v_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`;
      let audioUrl: string | undefined;
      let coverUrl: string | undefined;

      if (item.audioUrl) {
        const audioFilename = await downloadAndSave(
          item.audioUrl,
          "audio",
          id
        );
        if (audioFilename) {
          audioUrl = `/api/media/audio/${audioFilename}`;
        } else {
          audioUrl = item.audioUrl;
        }
      }

      if (item.imageUrl) {
        const coverFilename = await downloadAndSave(
          item.imageUrl,
          "cover",
          id
        );
        if (coverFilename) {
          coverUrl = `/api/media/cover/${coverFilename}`;
        } else {
          coverUrl = item.imageUrl;
        }
      }

      results.push({ audioUrl, coverUrl });
    }

    return NextResponse.json({ items: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "持久化失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
