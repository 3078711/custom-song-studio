import { NextRequest, NextResponse } from "next/server";
import {
  sunoUploadExtend,
  sunoAddVocals,
  sunoAddInstrumental,
  sunoGenerateMashup,
} from "@/lib/suno";

/** Phase 4: 基于 uploadUrl 的编辑能力 */
const UPLOAD_CAPABILITIES = [
  "uploadExtend",
  "addVocals",
  "addInstrumental",
  "mashup",
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capability, ...params } = body;

    if (!capability || !UPLOAD_CAPABILITIES.includes(capability)) {
      return NextResponse.json(
        { error: `无效的 capability，支持: ${UPLOAD_CAPABILITIES.join(", ")}` },
        { status: 400 }
      );
    }

    switch (capability) {
      case "uploadExtend": {
        const uploadUrl = params.uploadUrl;
        if (!uploadUrl) {
          return NextResponse.json({ error: "缺少 uploadUrl" }, { status: 400 });
        }
        const taskId = await sunoUploadExtend({
          uploadUrl,
          model: params.model,
          defaultParamFlag: params.defaultParamFlag,
          prompt: params.prompt,
          style: params.style,
          title: params.title,
          continueAt: params.continueAt,
          instrumental: params.instrumental,
        });
        return NextResponse.json({ taskId });
      }
      case "addVocals": {
        const uploadUrl = params.uploadUrl;
        if (!uploadUrl) {
          return NextResponse.json({ error: "缺少 uploadUrl（需伴奏）" }, { status: 400 });
        }
        const taskId = await sunoAddVocals({
          uploadUrl,
          prompt: params.prompt || "舒缓的人声",
          style: params.style || "流行",
          title: params.title || "添加人声",
          negativeTags: params.negativeTags,
          model: params.model,
          vocalGender: params.vocalGender,
          styleWeight: params.styleWeight,
          weirdnessConstraint: params.weirdnessConstraint,
          audioWeight: params.audioWeight,
        });
        return NextResponse.json({ taskId });
      }
      case "addInstrumental": {
        const uploadUrl = params.uploadUrl;
        if (!uploadUrl) {
          return NextResponse.json({ error: "缺少 uploadUrl（需人声）" }, { status: 400 });
        }
        const taskId = await sunoAddInstrumental({
          uploadUrl,
          tags: params.tags || "流行",
          title: params.title || "添加伴奏",
          negativeTags: params.negativeTags,
          model: params.model,
          vocalGender: params.vocalGender,
          styleWeight: params.styleWeight,
          weirdnessConstraint: params.weirdnessConstraint,
          audioWeight: params.audioWeight,
        });
        return NextResponse.json({ taskId });
      }
      case "mashup": {
        const { uploadUrlList } = params;
        if (!Array.isArray(uploadUrlList) || uploadUrlList.length !== 2) {
          return NextResponse.json({ error: "缺少 uploadUrlList（需 2 个音频 URL）" }, { status: 400 });
        }
        const taskId = await sunoGenerateMashup({
          uploadUrlList: [uploadUrlList[0], uploadUrlList[1]],
          customMode: params.customMode,
          instrumental: params.instrumental,
          prompt: params.prompt,
          style: params.style,
          title: params.title,
          model: params.model,
          vocalGender: params.vocalGender,
          styleWeight: params.styleWeight,
          weirdnessConstraint: params.weirdnessConstraint,
          audioWeight: params.audioWeight,
        });
        return NextResponse.json({ taskId });
      }
      default:
        return NextResponse.json({ error: `未实现: ${capability}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "请求失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
