import { NextRequest, NextResponse } from "next/server";
import {
  sunoExtend,
  sunoReplaceSection,
  sunoSeparateVocals,
  sunoGeneratePersona,
  sunoCreateMusicVideo,
} from "@/lib/suno";
import { getEditCapability } from "@/lib/editCapabilities";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capabilityId, params } = body;

    if (!capabilityId || !params) {
      return NextResponse.json(
        { error: "缺少 capabilityId 或 params" },
        { status: 400 }
      );
    }

    const cap = getEditCapability(capabilityId);
    if (!cap) {
      return NextResponse.json(
        { error: `未知能力: ${capabilityId}` },
        { status: 400 }
      );
    }

    switch (capabilityId) {
      case "extend": {
        const taskId = await sunoExtend({
          audioId: params.audioId,
          model: params.model || "V4_5ALL",
          defaultParamFlag: params.defaultParamFlag,
          prompt: params.prompt,
          style: params.style,
          title: params.title,
          continueAt: params.continueAt,
        });
        return NextResponse.json({ taskId, async: true });
      }
      case "replace": {
        const taskId = await sunoReplaceSection({
          taskId: params.taskId,
          audioId: params.audioId,
          prompt: params.prompt,
          tags: params.tags,
          title: params.title,
          infillStartS: Number(params.infillStartS),
          infillEndS: Number(params.infillEndS),
          negativeTags: params.negativeTags,
        });
        return NextResponse.json({ taskId, async: true });
      }
      case "separate": {
        const taskId = await sunoSeparateVocals({
          taskId: params.taskId,
          audioId: params.audioId,
          type: params.type || "separate_vocal",
        });
        return NextResponse.json({ taskId, async: true });
      }
      case "persona": {
        const result = await sunoGeneratePersona({
          taskId: params.taskId,
          audioId: params.audioId,
          name: params.name,
          description: params.description,
          style: params.style,
          vocalStart: params.vocalStart,
          vocalEnd: params.vocalEnd,
        });
        return NextResponse.json({
          personaId: result.personaId,
          name: result.name,
          description: result.description,
          async: false,
        });
      }
      case "musicVideo": {
        const taskId = await sunoCreateMusicVideo({
          taskId: params.taskId,
          audioId: params.audioId,
          author: params.author,
          domainName: params.domainName,
        });
        return NextResponse.json({ taskId, async: true });
      }
      default:
        return NextResponse.json(
          { error: `未实现的能力: ${capabilityId}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "编辑请求失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
