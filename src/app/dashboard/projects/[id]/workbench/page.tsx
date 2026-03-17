"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProjectById, type ProjectBrief } from "@/lib/projects";
import { getCustomerById } from "@/lib/customers";
import {
  listVersionsByProject,
  listTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  createVersion,
  updateVersion,
  getVersionById,
  getTaskById,
  getNextVersionNo,
  createEditTask,
  updateEditTask,
  listEditTasksByProject,
  getEditTaskById,
  type SongVersion,
  type GenerationTask,
  type EditTask,
} from "@/lib/songVersions";
import { EDIT_CAPABILITIES, type EditCapabilityId } from "@/lib/editCapabilities";
import {
  MODEL_OPTIONS,
  STYLE_OPTIONS,
  VOCAL_GENDER_OPTIONS,
  ERA_OPTIONS,
  SCENE_OPTIONS,
  MOOD_OPTIONS,
  INSTRUMENT_OPTIONS,
  VOCAL_TONE_OPTIONS,
  LANGUAGE_OPTIONS,
  ETHNIC_OPTIONS,
  buildPrompt,
  buildStyle,
  getVocalGenderForApi,
  getEthnicNegativeTags,
  hasStructureTags,
  LYRIC_STRUCTURE_HINT,
  stripStyleExtrasFromPrompt,
  REFERENCE_MODEL_OPTIONS,
} from "@/lib/workbenchParams";
import { prepareAudioForUpload } from "@/lib/audioConvert";
import { normalizeCopyrightError } from "@/lib/suno";

/** 将歌词按段落/结构标签拆分为竖排显示块 */
function parseLyricsToSegments(text: string): string[] {
  if (!text?.trim()) return [];
  const trimmed = text.trim();
  const parts = trimmed.split(/(\[[\w\s]+\])/g);
  if (parts.length > 1) {
    const segments: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p.trim()) continue;
      if (/^\[[\w\s]+\]$/.test(p)) {
        const next = (parts[i + 1] ?? "").trim();
        segments.push(p + (next ? "\n" + next : ""));
        i++;
      } else {
        segments.push(p.trim());
      }
    }
    return segments.length ? segments : [trimmed];
  }
  const byPara = trimmed.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  return byPara.length > 1 ? byPara : [trimmed];
}

/** 从表单构建创作参数快照（用于版本详情展示） */
function buildCreationParams(form: FormState): Record<string, string | number | boolean | undefined> {
  const lyricModeLabel = LYRIC_MODE_OPTIONS.find((o) => o.value === form.lyricMode)?.label ?? form.lyricMode;
  const modelLabel = MODEL_OPTIONS.find((m) => m.value === form.model)?.label ?? form.model;
  const vocalLabel = (VOCAL_GENDER_OPTIONS.find((v) => v.value === form.vocalGender)?.label ?? form.vocalGender) || "不指定";
  const instrumentLabel = (INSTRUMENT_OPTIONS.find((i) => i.id === form.instrumentId)?.label ?? form.instrumentId) || "无";
  const toneLabel = (VOCAL_TONE_OPTIONS.find((t) => t.id === form.vocalToneId)?.label ?? form.vocalToneId) || "无";
  const eraLabel = (ERA_OPTIONS.find((e) => e.id === form.eraId)?.label ?? form.eraId) || "不指定";
  const sceneLabel = (SCENE_OPTIONS.find((s) => s.id === form.sceneId)?.label ?? form.sceneId) || "无";
  const langLabel = (LANGUAGE_OPTIONS.find((l) => l.id === form.languageId)?.label ?? form.languageId) || "中文";
  const ethnicLabel = (ETHNIC_OPTIONS.find((e) => e.id === form.ethnicId)?.label ?? form.ethnicId) || "无";
  return {
    歌词模式: lyricModeLabel,
    模型: modelLabel,
    /** API 用模型值，延长/替换等编辑需与源音乐一致 */
    model: form.model,
    风格: form.style || "—",
    标题: form.title || "—",
    人声: vocalLabel,
    声线: toneLabel,
    乐器: instrumentLabel,
    语言: langLabel,
    民族: ethnicLabel,
    年代: eraLabel,
    场景: sceneLabel,
    情绪: form.mood || "—",
    描述或歌词: form.prompt || "—",
    补充风格: form.styleExtra || "—",
    补充年代: form.eraExtra || "—",
    补充场景: form.sceneExtra || "—",
    补充情绪: form.moodExtra || "—",
    补充乐器: form.instrumentExtra || "—",
    补充人声: form.vocalExtra || "—",
    补充民族: form.ethnicExtra || "—",
    纯音乐: form.instrumental,
    styleWeight: form.styleWeight,
    weirdnessConstraint: form.weirdnessConstraint,
  };
}

/** 歌词模式：不能修改=严格按用户歌词；同意修改=AI可生成/优化歌词 */
const LYRIC_MODE_OPTIONS = [
  { value: "strict", label: "不能修改歌词", desc: "严格按您填写的歌词生成，不做任何修改" },
  { value: "flexible", label: "同意修改歌词", desc: "根据描述生成或优化歌词，AI可自由创作" },
] as const;

type FormState = {
  lyricMode: "strict" | "flexible";
  model: string;
  prompt: string;
  style: string;
  title: string;
  instrumental: boolean;
  vocalGender: string;
  eraId: string;
  sceneId: string;
  mood: string;
  instrumentId: string;
  vocalToneId: string;
  languageId: string;
  ethnicId: string;
  styleExtra: string;
  vocalExtra: string;
  eraExtra: string;
  sceneExtra: string;
  moodExtra: string;
  instrumentExtra: string;
  ethnicExtra: string;
  negativeTags: string;
  styleWeight: number;
  weirdnessConstraint: number;
  showAdvanced: boolean;
};

const defaultForm: FormState = {
  lyricMode: "strict",
  model: "V5",
  prompt: "",
  style: "流行",
  title: "",
  instrumental: false,
  vocalGender: "",
  eraId: "",
  sceneId: "",
  mood: "",
  instrumentId: "",
  vocalToneId: "",
  languageId: "zh",
  ethnicId: "",
  styleExtra: "",
  vocalExtra: "",
  eraExtra: "",
  sceneExtra: "",
  moodExtra: "",
  instrumentExtra: "",
  ethnicExtra: "",
  negativeTags: "",
  styleWeight: 0.65,
  weirdnessConstraint: 0.5,
  showAdvanced: false,
};

export default function WorkbenchPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState(getProjectById(projectId));
  const [versions, setVersions] = useState<SongVersion[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [editTasks, setEditTasks] = useState<EditTask[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [lyricFontSize, setLyricFontSize] = useState<"sm" | "base" | "lg">(() => {
    if (typeof window === "undefined") return "base";
    return (localStorage.getItem("workbench-lyric-font") as "sm" | "base" | "lg") || "base";
  });
  const [editModalCapability, setEditModalCapability] = useState<EditCapabilityId | null>(null);
  const [editConfirmCapability, setEditConfirmCapability] = useState<EditCapabilityId | null>(null);
  const [currentEditTaskId, setCurrentEditTaskId] = useState<string | null>(null);
  const [editReplaceForm, setEditReplaceForm] = useState({
    infillStartS: 10,
    infillEndS: 25,
    prompt: "",
    tags: "",
    title: "",
  });
  const [editPersonaForm, setEditPersonaForm] = useState({
    name: "",
    description: "",
    style: "",
  });
  const [layoutPreset, setLayoutPreset] = useState<"balanced" | "task" | "versions">(() => {
    if (typeof window === "undefined") return "balanced";
    return (localStorage.getItem("workbench-layout") as "balanced" | "task" | "versions") || "balanced";
  });
  const [createMode, setCreateMode] = useState<"fromScratch" | "reference">("fromScratch");
  const [referenceFileUrl, setReferenceFileUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceStatus, setReferenceStatus] = useState<string | null>(null); // "转换中…" | "上传中…"
  const [referenceInputSource, setReferenceInputSource] = useState<"file" | "url">("file");
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [referenceUrlLoading, setReferenceUrlLoading] = useState(false);
  const [referenceUrlError, setReferenceUrlError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [boostStyleLoading, setBoostStyleLoading] = useState(false);
  const [aiLyricsOpen, setAiLyricsOpen] = useState(false);
  const [aiLyricsPrompt, setAiLyricsPrompt] = useState("");
  const [aiLyricsLoading, setAiLyricsLoading] = useState(false);
  const [aiLyricsItems, setAiLyricsItems] = useState<Array<{ text: string; title: string }>>([]);
  const [wavExportLoading, setWavExportLoading] = useState(false);
  const [wavExportUrl, setWavExportUrl] = useState<string | null>(null);
  const [midiExportLoading, setMidiExportLoading] = useState(false);
  const [midiExportUrl, setMidiExportUrl] = useState<string | null>(null);
  const [midiExportForEditTaskId, setMidiExportForEditTaskId] = useState<string | null>(null);
  const [separateType, setSeparateType] = useState<"separate_vocal" | "split_stem">("separate_vocal");

  const displayedVersions = selectedTaskId
    ? (() => {
        const t = tasks.find((x) => x.id === selectedTaskId);
        const ids = t?.resultVersionIds ?? (t?.resultVersionId ? [t.resultVersionId] : []);
        return versions.filter((v) => ids.includes(v.id));
      })()
    : versions;

  useEffect(() => {
    localStorage.setItem("workbench-lyric-font", lyricFontSize);
  }, [lyricFontSize]);
  useEffect(() => {
    localStorage.setItem("workbench-layout", layoutPreset);
  }, [layoutPreset]);

  const loadData = () => {
    setProject(getProjectById(projectId));
    setVersions(listVersionsByProject(projectId));
    setTasks(listTasksByProject(projectId));
    setEditTasks(listEditTasksByProject(projectId));
  };

  const fetchReferenceFromUrl = async (url: string) => {
    const trimmed = url.trim();
    try {
      const u = new URL(trimmed);
      if (!["http:", "https:"].includes(u.protocol)) {
        setReferenceUrlError("请输入有效的 http 或 https 链接");
        return;
      }
    } catch {
      setReferenceUrlError("请输入有效的链接");
      return;
    }
    setReferenceUrlError(null);
    setReferenceUrlLoading(true);
    try {
      const res = await fetch("/api/suno/upload-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: trimmed }),
      });
      const j = await res.json();
      if (!res.ok || j.error) {
        const msg = j.message || j.error || "无法访问该链接";
        setReferenceUrlError(typeof msg === "string" ? msg : "无法访问该链接，请确认可公网访问且非音乐平台链接");
        return;
      }
      setReferenceFileUrl(j.fileUrl);
      setReferenceUrlError(null);
    } catch {
      setReferenceUrlError("服务暂时不可用，请稍后重试");
    } finally {
      setReferenceUrlLoading(false);
    }
  };

  /** 从项目 Brief 带入创作参数 */
  const applyBriefToForm = () => {
    const p = getProjectById(projectId);
    const b = p?.brief;
    if (!b || !Object.values(b).some((v) => v?.trim())) {
      alert("该项目暂无需求 Brief，请先在项目详情中填写");
      return;
    }
    const updates: Partial<FormState> = {};
    if (b.referenceTrackUrl?.trim()) {
      setCreateMode("reference");
      setReferenceInputSource("url");
      setReferenceUrlInput(b.referenceTrackUrl.trim());
      setReferenceUrlError(null);
      fetchReferenceFromUrl(b.referenceTrackUrl.trim());
    }
    if (b.stylePreference?.trim()) {
      const match = STYLE_OPTIONS.find(
        (s) =>
          s.toLowerCase().includes(b.stylePreference!.toLowerCase()) ||
          b.stylePreference!.toLowerCase().includes(s.toLowerCase())
      );
      if (match) updates.style = match;
      else updates.styleExtra = b.stylePreference.trim();
    }
    if (b.moodScene?.trim()) {
      const moodMatch = MOOD_OPTIONS.find((m) =>
        b.moodScene!.toLowerCase().includes(m.mood.toLowerCase())
      );
      if (moodMatch) updates.mood = moodMatch.mood;
      else updates.moodExtra = b.moodScene.trim();
    }
    if (b.lyricDirection?.trim() || b.freeDescription?.trim()) {
      const parts = [b.lyricDirection, b.freeDescription].filter(Boolean);
      updates.prompt = parts.join("\n\n");
    }
    if (b.referenceTracks?.trim()) {
      updates.styleExtra = [updates.styleExtra, b.referenceTracks.trim()]
        .filter(Boolean)
        .join("；");
    }
    if (b.specialRequirements?.trim()) {
      updates.styleExtra = [updates.styleExtra, b.specialRequirements.trim()]
        .filter(Boolean)
        .join("；");
    }
    setForm((f) => ({ ...f, ...updates }));
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (!currentTaskId || !isGenerating) return;
    const task = getTaskById(currentTaskId);
    if (!task || task.status === "completed" || task.status === "failed") {
      setIsGenerating(false);
      setCurrentTaskId(null);
      loadData();
      return;
    }
    const timer = setInterval(loadData, 1500);
    return () => clearInterval(timer);
  }, [currentTaskId, isGenerating, projectId]);

  const customMode = form.lyricMode === "strict";

  const getFinalPrompt = () =>
    buildPrompt({
      basePrompt: form.prompt,
      lyricsOnly: customMode,
      baseStyle: form.style || undefined,
      ethnicId: form.ethnicId || undefined,
      ethnicExtra: form.ethnicExtra || undefined,
      sceneId: form.sceneId || undefined,
      mood: form.mood || undefined,
      instrumentId: form.instrumentId || undefined,
      vocalToneId: form.vocalToneId || undefined,
      languageId: form.instrumental ? undefined : form.languageId || undefined,
      vocalGenderId: form.vocalGender || undefined,
      eraId: form.eraId || undefined,
      styleExtra: form.styleExtra || undefined,
      vocalExtra: form.vocalExtra || undefined,
      eraExtra: form.eraExtra || undefined,
      sceneExtra: form.sceneExtra || undefined,
      moodExtra: form.moodExtra || undefined,
      instrumentExtra: form.instrumentExtra || undefined,
      maxLength: customMode ? 5000 : 500,
    });

  const getFinalStyle = () =>
    buildStyle({
      baseStyle: form.style,
      ethnicId: form.ethnicId || undefined,
      styleExtra: form.styleExtra || undefined,
      ethnicExtra: form.ethnicExtra || undefined,
      instrumentId: form.instrumentId || undefined,
      instrumentExtra: form.instrumentExtra || undefined,
      mood: form.mood || undefined,
      moodExtra: form.moodExtra || undefined,
      sceneId: form.sceneId || undefined,
      sceneExtra: form.sceneExtra || undefined,
      vocalToneId: form.vocalToneId || undefined,
      vocalGenderId: form.vocalGender || undefined,
      vocalExtra: form.vocalExtra || undefined,
      eraId: form.eraId || undefined,
      eraExtra: form.eraExtra || undefined,
      languageId: form.instrumental ? undefined : form.languageId || undefined,
      lyricsWithoutStructure: customMode && !!form.prompt.trim() && !hasStructureTags(form.prompt),
    });

  const runSimulatedGeneration = async (
    task: GenerationTask,
    finalPrompt: string,
    finalStyle: string
  ) => {
    const steps = [20, 40, 60, 80, 100];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 1600));
      updateTask(task.id, { progress: steps[i] });
      loadData();
    }
    const roundNo = 1;
    const versionIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const versionNo = getNextVersionNo(projectId, roundNo);
      const version = createVersion({
        projectId,
        versionNo,
        roundNo,
        prompt: finalPrompt || "(纯音乐)",
        lyrics: form.prompt.trim() || undefined,
        style: finalStyle,
        title: form.title || "未命名",
        audioUrl: undefined,
        status: "draft",
        isCandidate: false,
        isSentToCustomer: false,
        isFinal: false,
        creationParams: buildCreationParams(form),
      });
      versionIds.push(version.id);
    }
    updateTask(task.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      resultVersionIds: versionIds,
      creationForm: form as unknown as Record<string, unknown>,
    });
    setIsGenerating(false);
    setCurrentTaskId(null);
    loadData();
  };

  const handleGenerate = async () => {
    const finalPrompt = getFinalPrompt();
    const finalStyle = getFinalStyle();
    if (!finalPrompt && !form.instrumental) {
      alert("请输入 Prompt，或勾选「纯音乐」");
      return;
    }
    if (customMode && !form.instrumental && !finalStyle) {
      alert("「不能修改歌词」模式下请选择风格");
      return;
    }

    setIsGenerating(true);
    const task = createTask(projectId, {
      prompt: finalPrompt || "(纯音乐)",
      style: finalStyle,
      title: form.title.trim() || "未命名",
    });
    updateTask(task.id, {
      status: "running",
      progress: 10,
      startedAt: new Date().toISOString(),
    });
    setCurrentTaskId(task.id);
    loadData();

    const vocalForSuno = getVocalGenderForApi(form.vocalGender);

    try {
      const res = await fetch("/api/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt || "(纯音乐)",
          style: finalStyle,
          title: form.title.trim() || "未命名",
          model: form.model,
          instrumental: form.instrumental,
          customMode,
          negativeTags: [form.negativeTags?.trim(), getEthnicNegativeTags(form.ethnicId)].filter(Boolean).join(", ") || undefined,
          vocalGender: vocalForSuno,
          styleWeight: form.styleWeight,
          weirdnessConstraint: form.weirdnessConstraint,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        if (
          json.error?.includes?.("SUNO_API_KEY") ||
          json.error?.includes?.("未配置")
        ) {
          await runSimulatedGeneration(task, finalPrompt, finalStyle);
          return;
        }
        throw new Error(json.error || "生成请求失败");
      }

      const sunoTaskId = json.taskId;
      updateTask(task.id, { sunoTaskId, progress: 20 });
      loadData();

      const pollInterval = 10000;
      const maxWait = 10 * 60 * 1000;
      const start = Date.now();
      let lastProgress = 20;

      while (Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));

        const infoRes = await fetch(
          `/api/suno/record-info?taskId=${encodeURIComponent(sunoTaskId)}`
        );
        const info = await infoRes.json();

        if (!infoRes.ok || info.error) {
          throw new Error(info.error || info.message || "查询任务状态失败");
        }

        const inProgressStatuses = ["PENDING", "GENERATING", "FIRST_SUCCESS", "TEXT_SUCCESS"];
        const isSunoFailed =
          info.status &&
          !inProgressStatuses.includes(info.status) &&
          info.status !== "SUCCESS";
        if (isSunoFailed) {
          throw new Error(normalizeCopyrightError(info.errorMessage || info.msg || `Suno 生成失败: ${info.status}`));
        }

        if (info.status === "SUCCESS" && info.response?.data?.length) {
          const items = info.response.data.slice(0, 2) as Array<{
            id?: string;
            audio_url?: string;
            image_url?: string;
            title?: string;
            duration?: number;
            prompt?: string;
          }>;
          let audioUrls: (string | undefined)[] = items.map((i) => i.audio_url);
          let coverUrls: (string | undefined)[] = items.map((i) => i.image_url);

          // 持久化到本地，避免 Suno 15 天后清除
          try {
            const persistRes = await fetch("/api/suno/persist-media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: items.map((i) => ({
                  audioUrl: i.audio_url,
                  imageUrl: i.image_url,
                })),
              }),
            });
            if (persistRes.ok) {
              const persist = await persistRes.json();
              if (persist.items?.length) {
                audioUrls = persist.items.map((p: { audioUrl?: string }) => p.audioUrl);
                coverUrls = persist.items.map((p: { coverUrl?: string }) => p.coverUrl);
              }
            }
          } catch {
            // 持久化失败时仍使用 Suno 原 URL
          }

          const roundNo = 1;
          const versionIds: string[] = [];

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const versionNo = getNextVersionNo(projectId, roundNo);
            const version = createVersion({
              projectId,
              versionNo,
              roundNo,
              prompt: finalPrompt || item.prompt || "",
              lyrics: item.prompt?.trim() || form.prompt.trim() || undefined,
              style: finalStyle,
              title: form.title?.trim() || item.title || "未命名",
              audioUrl: audioUrls[i],
              coverUrl: coverUrls[i],
              durationSeconds: item.duration,
              status: "draft",
              isCandidate: false,
              isSentToCustomer: false,
              isFinal: false,
              sunoTaskId: sunoTaskId,
              sunoAudioId: item.id,
              creationParams: buildCreationParams(form),
            });
            versionIds.push(version.id);

            if (!form.instrumental && item.id) {
              fetch(`/api/suno/timestamped-lyrics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: sunoTaskId, audioId: item.id }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.lyrics?.trim()) {
                    updateVersion(version.id, { lyrics: data.lyrics.trim() });
                    loadData();
                  }
                })
                .catch(() => {});
            }
          }

          updateTask(task.id, {
            status: "completed",
            progress: 100,
            completedAt: new Date().toISOString(),
            resultVersionIds: versionIds,
            creationForm: form as unknown as Record<string, unknown>,
          });
          setIsGenerating(false);
          setCurrentTaskId(null);
          loadData();
          return;
        }

        lastProgress = Math.min(lastProgress + 15, 90);
        updateTask(task.id, { progress: lastProgress });
        loadData();
      }

      throw new Error("生成超时，请稍后在任务列表中查看");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败";
      updateTask(task.id, {
        status: "failed",
        errorMessage: msg,
        completedAt: new Date().toISOString(),
      });
      alert(msg);
    } finally {
      setIsGenerating(false);
      setCurrentTaskId(null);
      loadData();
    }
  };

  const handleReferenceCover = async () => {
    if (!referenceFileUrl || !form.prompt.trim() || !form.style.trim() || !form.title.trim()) {
      alert("请先上传参考曲并填写新歌词、风格、标题");
      return;
    }
    setIsGenerating(true);
    const task = createTask(projectId, {
      prompt: form.prompt.trim(),
      style: form.style.trim(),
      title: form.title.trim(),
    });
    updateTask(task.id, {
      status: "running",
      progress: 10,
      startedAt: new Date().toISOString(),
    });
    setCurrentTaskId(task.id);
    loadData();

    try {
      const res = await fetch("/api/suno/upload-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadUrl: referenceFileUrl,
          prompt: form.prompt.trim(),
          style: form.style.trim(),
          title: form.title.trim(),
          customMode: true,
          instrumental: false,
          model: form.model,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        if (
          json.error?.includes?.("SUNO_API_KEY") ||
          json.error?.includes?.("未配置")
        ) {
          alert("请配置 SUNO_API_KEY 后使用翻唱功能");
          throw new Error(json.error);
        }
        throw new Error(normalizeCopyrightError(json.error || "翻唱请求失败"));
      }
      const sunoTaskId = json.taskId;
      updateTask(task.id, { sunoTaskId, progress: 20 });
      loadData();

      const pollInterval = 10000;
      const maxWait = 10 * 60 * 1000;
      const start = Date.now();
      let lastProgress = 20;

      while (Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const infoRes = await fetch(
          `/api/suno/record-info?taskId=${encodeURIComponent(sunoTaskId)}`
        );
        const info = await infoRes.json();

        if (!infoRes.ok || info.error) {
          throw new Error(normalizeCopyrightError(info.error || info.message || "查询任务状态失败"));
        }

        const inProgressStatusesRef = ["PENDING", "GENERATING", "FIRST_SUCCESS", "TEXT_SUCCESS"];
        const isSunoFailedRef =
          info.status &&
          !inProgressStatusesRef.includes(info.status) &&
          info.status !== "SUCCESS";
        if (isSunoFailedRef) {
          throw new Error(normalizeCopyrightError(info.errorMessage || info.msg || `Suno 翻唱失败: ${info.status}`));
        }

        if (info.status === "SUCCESS" && info.response?.data?.length) {
          const items = info.response.data.slice(0, 2) as Array<{
            id?: string;
            audio_url?: string;
            image_url?: string;
            title?: string;
            duration?: number;
            prompt?: string;
          }>;
          let audioUrls: (string | undefined)[] = items.map((i) => i.audio_url);
          let coverUrls: (string | undefined)[] = items.map((i) => i.image_url);
          try {
            const persistRes = await fetch("/api/suno/persist-media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: items.map((i) => ({
                  audioUrl: i.audio_url,
                  imageUrl: i.image_url,
                })),
              }),
            });
            if (persistRes.ok) {
              const persist = await persistRes.json();
              if (persist.items?.length) {
                audioUrls = persist.items.map((p: { audioUrl?: string }) => p.audioUrl);
                coverUrls = persist.items.map((p: { coverUrl?: string }) => p.coverUrl);
              }
            }
          } catch {
            // 持久化失败时仍使用 Suno 原 URL
          }

          const roundNo = 1;
          const versionIds: string[] = [];
          const finalPrompt = form.prompt.trim();
          const finalStyle = form.style.trim();

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const versionNo = getNextVersionNo(projectId, roundNo);
            const version = createVersion({
              projectId,
              versionNo,
              roundNo,
              prompt: finalPrompt,
              lyrics: item.prompt?.trim() || finalPrompt,
              style: finalStyle,
              title: form.title.trim() || item.title || "翻唱",
              audioUrl: audioUrls[i],
              coverUrl: coverUrls[i],
              durationSeconds: item.duration,
              status: "draft",
              isCandidate: false,
              isSentToCustomer: false,
              isFinal: false,
              sunoTaskId,
              sunoAudioId: item.id,
              creationParams: buildCreationParams(form),
            });
            versionIds.push(version.id);

            if (item.id) {
              fetch(`/api/suno/timestamped-lyrics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: sunoTaskId, audioId: item.id }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.lyrics?.trim()) {
                    updateVersion(version.id, { lyrics: data.lyrics.trim() });
                    loadData();
                  }
                })
                .catch(() => {});
            }
          }

          updateTask(task.id, {
            status: "completed",
            progress: 100,
            completedAt: new Date().toISOString(),
            resultVersionIds: versionIds,
            creationForm: form as unknown as Record<string, unknown>,
          });
          setIsGenerating(false);
          setCurrentTaskId(null);
          loadData();
          return;
        }

        lastProgress = Math.min(lastProgress + 15, 90);
        updateTask(task.id, { progress: lastProgress });
        loadData();
      }

      throw new Error("翻唱超时，请稍后在任务列表中查看");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "翻唱失败";
      updateTask(task.id, {
        status: "failed",
        errorMessage: msg,
        completedAt: new Date().toISOString(),
      });
      alert(msg);
    } finally {
      setIsGenerating(false);
      setCurrentTaskId(null);
      loadData();
    }
  };

  const [refreshingLyricsId, setRefreshingLyricsId] = useState<string | null>(null);

  const handleVersionAction = (
    versionId: string,
    action: "candidate" | "sent" | "reject" | "final"
  ) => {
    const v = getVersionById(versionId);
    if (!v) return;
    const updates: Partial<SongVersion> = {};
    if (action === "candidate") {
      updates.isCandidate = !v.isCandidate;
      updates.status = updates.isCandidate ? "candidate" : "draft";
    } else if (action === "sent") {
      updates.isSentToCustomer = true;
      updates.status = "sent";
    } else if (action === "reject") {
      updates.status = "rejected";
    } else if (action === "final") {
      updates.isFinal = true;
      updates.status = "final";
    }
    updateVersion(versionId, updates);
    loadData();
  };

  const handleRefreshLyrics = async (versionId: string) => {
    const v = getVersionById(versionId);
    if (!v) return;
    let taskId: string | undefined = v.sunoTaskId;
    let audioId: string | undefined = v.sunoAudioId;
    if (!taskId || !audioId) {
      const task = listTasksByProject(projectId).find(
        (t) => t.resultVersionIds?.includes(versionId) && t.sunoTaskId
      );
      if (!task?.sunoTaskId) {
        alert("该版本无法获取改编歌词（缺少任务信息）");
        return;
      }
      const idx = task.resultVersionIds?.indexOf(versionId) ?? -1;
      if (idx < 0) return;
      const infoRes = await fetch(
        `/api/suno/record-info?taskId=${encodeURIComponent(task.sunoTaskId)}`
      );
      const info = await infoRes.json();
      const items = info.response?.data ?? [];
      const item = items[idx];
      audioId = item?.id;
      taskId = task.sunoTaskId;
      if (!audioId) {
        alert("无法获取该版本的音频 ID");
        return;
      }
    }
    setRefreshingLyricsId(versionId);
    try {
      const res = await fetch("/api/suno/timestamped-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, audioId }),
      });
      const data = await res.json();
      if (data.lyrics?.trim()) {
        updateVersion(versionId, {
          lyrics: data.lyrics.trim(),
          sunoTaskId: taskId,
          sunoAudioId: audioId,
        });
        loadData();
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("获取改编歌词失败");
    } finally {
      setRefreshingLyricsId(null);
    }
  };

  const handleRunEdit = async (
    capabilityId: EditCapabilityId,
    extraParams?: Record<string, unknown>
  ) => {
    const v = selectedVersionId ? getVersionById(selectedVersionId) : null;
    if (!v?.sunoTaskId || !v.sunoAudioId) {
      alert("该版本缺少 Suno 任务信息，无法进行深度编辑");
      return;
    }
    const storedModel = v.creationParams?.model as string | undefined;
    const modelLabel = v.creationParams?.模型 as string | undefined;
    const model =
      storedModel && ["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5"].includes(storedModel)
        ? storedModel
        : (modelLabel ? MODEL_OPTIONS.find((m) => m.label === modelLabel)?.value : undefined) ?? form.model ?? "V4_5ALL";
    const baseParams: Record<string, unknown> = {
      taskId: v.sunoTaskId,
      audioId: v.sunoAudioId,
      model,
      ...extraParams,
    };
    if (capabilityId === "extend") {
      delete baseParams.taskId;
      (baseParams as Record<string, unknown>).defaultParamFlag = false;
    }

    setEditModalCapability(null);
    const task = createEditTask({
      projectId,
      capabilityId,
      sourceVersionId: v.id,
      status: "running",
      progress: 10,
      startedAt: new Date().toISOString(),
    });
    setCurrentEditTaskId(task.id);
    loadData();

    try {
      const res = await fetch("/api/suno/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilityId, params: baseParams }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (capabilityId === "persona" && data.personaId) {
        updateEditTask(task.id, {
          status: "completed",
          progress: 100,
          personaId: data.personaId,
          personaName: data.name,
          completedAt: new Date().toISOString(),
        });
        setCurrentEditTaskId(null);
        loadData();
        alert(`Persona 生成成功！\npersonaId: ${data.personaId}\n请复制保存，后续生成时可使用此人声风格。`);
        return;
      }

      if (data.taskId && (capabilityId === "extend" || capabilityId === "replace")) {
        updateEditTask(task.id, { sunoTaskId: data.taskId, progress: 20 });
        loadData();
        const pollInterval = 10000;
        const maxWait = 10 * 60 * 1000;
        const start = Date.now();
        while (Date.now() - start < maxWait) {
          await new Promise((r) => setTimeout(r, pollInterval));
          const infoRes = await fetch(
            `/api/suno/record-info?taskId=${encodeURIComponent(data.taskId)}`
          );
          const info = await infoRes.json();
          if (info.status === "SUCCESS" && info.response?.data?.length) {
            const items = info.response.data;
            const persistRes = await fetch("/api/suno/persist-media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: items.map((i: { audio_url?: string; image_url?: string }) => ({
                  audioUrl: i.audio_url,
                  imageUrl: i.image_url,
                })),
              }),
            });
            let audioUrls = items.map((i: { audio_url?: string }) => i.audio_url);
            let coverUrls = items.map((i: { image_url?: string }) => i.image_url);
            if (persistRes.ok) {
              try {
                const persist = await persistRes.json();
                if (persist.items?.length) {
                  audioUrls = persist.items.map((p: { audioUrl?: string }) => p.audioUrl);
                  coverUrls = persist.items.map((p: { coverUrl?: string }) => p.coverUrl);
                }
              } catch {
                /* keep original */
              }
            }
            const versionIds: string[] = [];
            for (let i = 0; i < items.length; i++) {
              const versionNo = getNextVersionNo(projectId, 1);
              const newV = createVersion({
                projectId,
                versionNo,
                roundNo: 1,
                prompt: items[i]?.prompt || v.prompt || "",
                lyrics: v.lyrics,
                style: v.style,
                title: items[i]?.title || v.title,
                audioUrl: audioUrls[i],
                coverUrl: coverUrls[i],
                durationSeconds: items[i]?.duration,
                status: "draft",
                isCandidate: false,
                isSentToCustomer: false,
                isFinal: false,
                sunoTaskId: data.taskId,
                sunoAudioId: items[i]?.id,
                sourceVersionId: v.id,
                editCapabilityId: capabilityId,
              });
              versionIds.push(newV.id);
            }
            updateEditTask(task.id, {
              status: "completed",
              progress: 100,
              resultVersionIds: versionIds,
              completedAt: new Date().toISOString(),
            });
            setCurrentEditTaskId(null);
            loadData();
            return;
          }
          if (info.status === "FAILED") {
            throw new Error(normalizeCopyrightError(info.errorMessage || "编辑失败"));
          }
          updateEditTask(task.id, { progress: Math.min(50 + (Date.now() - start) / 6000, 90) });
          loadData();
        }
        throw new Error("编辑超时");
      }

      if (data.taskId && capabilityId === "separate") {
        const sepType = (extraParams?.type as "separate_vocal" | "split_stem") || "separate_vocal";
        updateEditTask(task.id, { sunoTaskId: data.taskId, progress: 20 });
        loadData();
        const pollInterval = 8000;
        const maxWait = 5 * 60 * 1000;
        const start = Date.now();
        while (Date.now() - start < maxWait) {
          await new Promise((r) => setTimeout(r, pollInterval));
          const sepRes = await fetch(
            `/api/suno/vocal-separation-info?taskId=${encodeURIComponent(data.taskId)}`
          );
          const sep = await sepRes.json();
          if (sep.status === "SUCCESS") {
            const stems: Record<string, string> = {
              vocalUrl: sep.vocalUrl,
              instrumentalUrl: sep.instrumentalUrl,
            };
            if (sepType === "split_stem") {
              if (sep.drumsUrl) stems.drumsUrl = sep.drumsUrl;
              if (sep.bassUrl) stems.bassUrl = sep.bassUrl;
              if (sep.guitarUrl) stems.guitarUrl = sep.guitarUrl;
              if (sep.keyboardUrl) stems.keyboardUrl = sep.keyboardUrl;
              if (sep.stringsUrl) stems.stringsUrl = sep.stringsUrl;
              if (sep.synthUrl) stems.synthUrl = sep.synthUrl;
              if (sep.percussionUrl) stems.percussionUrl = sep.percussionUrl;
              if (sep.brassUrl) stems.brassUrl = sep.brassUrl;
              if (sep.woodwindsUrl) stems.woodwindsUrl = sep.woodwindsUrl;
              if (sep.fxUrl) stems.fxUrl = sep.fxUrl;
              if (sep.backingVocalsUrl) stems.backingVocalsUrl = sep.backingVocalsUrl;
            }
            const originData = sep.originData?.map((x: { id: string; stem_type_group_name?: string }) => ({
              id: x.id,
              stem_type_group_name: x.stem_type_group_name,
            }));
            updateEditTask(task.id, {
              status: "completed",
              progress: 100,
              stems,
              separationOriginData: sepType === "split_stem" ? originData : undefined,
              completedAt: new Date().toISOString(),
            });
            setCurrentEditTaskId(null);
            loadData();
            const msg = sepType === "split_stem"
              ? `分轨分离完成！\n人声: ${sep.vocalUrl ? "已生成" : "—"}\n多乐器分轨已生成，可点击「生成 MIDI」导出 MIDI 文件。`
              : `人声分离完成！\n人声: ${sep.vocalUrl ? "已生成" : "—"}\n伴奏: ${sep.instrumentalUrl ? "已生成" : "—"}\n可在编辑任务记录中查看链接。`;
            alert(msg);
            return;
          }
          if (sep.status === "GENERATE_AUDIO_FAILED" || sep.status === "CREATE_TASK_FAILED") {
            throw new Error(sep.errorMessage || "人声分离失败");
          }
          updateEditTask(task.id, { progress: 30 + ((Date.now() - start) / maxWait) * 50 });
          loadData();
        }
        throw new Error("人声分离超时");
      }

      if (data.taskId && capabilityId === "musicVideo") {
        updateEditTask(task.id, { sunoTaskId: data.taskId, progress: 20 });
        loadData();
        const pollInterval = 10000;
        const maxWait = 10 * 60 * 1000;
        const start = Date.now();
        while (Date.now() - start < maxWait) {
          await new Promise((r) => setTimeout(r, pollInterval));
          const mvRes = await fetch(
            `/api/suno/music-video-info?taskId=${encodeURIComponent(data.taskId)}`
          );
          const mv = await mvRes.json();
          if (mv.status === "SUCCESS" && mv.videoUrl) {
            updateEditTask(task.id, {
              status: "completed",
              progress: 100,
              videoUrl: mv.videoUrl,
              completedAt: new Date().toISOString(),
            });
            setCurrentEditTaskId(null);
            loadData();
            alert(`音乐视频生成完成！\n可在编辑任务记录中查看或下载视频链接。`);
            return;
          }
          if (mv.status === "GENERATE_MP4_FAILED" || mv.status === "CREATE_TASK_FAILED") {
            throw new Error(mv.errorMessage || "音乐视频生成失败");
          }
          updateEditTask(task.id, { progress: 30 + ((Date.now() - start) / maxWait) * 50 });
          loadData();
        }
        throw new Error("音乐视频生成超时");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "编辑失败";
      updateEditTask(task.id, {
        status: "failed",
        errorMessage: msg,
        completedAt: new Date().toISOString(),
      });
      setCurrentEditTaskId(null);
      loadData();
      alert(msg);
    }
  };

  if (!project) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/projects"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          ← 返回项目中心
        </Link>
        <p className="text-amber-600 dark:text-amber-400">项目不存在</p>
      </div>
    );
  }

  const customer = getCustomerById(project.customerId);
  const currentTask = currentTaskId ? getTaskById(currentTaskId) : null;

  const inputCls =
    "w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600 disabled:opacity-60";
  const labelCls = "mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200";

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard/projects"
              className="text-amber-600 hover:underline dark:text-amber-400"
            >
              项目中心
            </Link>
            <span className="text-amber-400 dark:text-amber-600">/</span>
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="text-amber-600 hover:underline dark:text-amber-400"
            >
              {project.projectName}
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
            歌曲生成工作台
          </h1>
          {customer && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400/80">
              {customer.name}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-amber-600 dark:text-amber-400">创作模式：</span>
          {(["fromScratch", "reference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCreateMode(m)}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                createMode === m
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
              }`}
            >
              {m === "fromScratch" ? "从零创作" : "参考创作"}
            </button>
          ))}
          <span className="ml-2 text-amber-600 dark:text-amber-400">布局：</span>
          {(["balanced", "task", "versions"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setLayoutPreset(p)}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                layoutPreset === p
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
              }`}
            >
              {p === "balanced" ? "均衡" : p === "task" ? "任务突出" : "版本突出"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          layoutPreset === "task"
            ? "lg:grid-cols-[1fr_1.2fr_1.8fr]"
            : layoutPreset === "versions"
              ? "lg:grid-cols-[1fr_1fr_2fr]"
              : "lg:grid-cols-[1fr_1.1fr_1.6fr]"
        }`}
      >
        {/* 左：创作参数 或 参考创作 */}
        <div className="rounded-xl border border-amber-200/60 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
          {createMode === "reference" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                参考创作 · 翻唱
              </h2>
              <p className="text-sm text-amber-600 dark:text-amber-400/80">
                上传参考曲或粘贴链接，保留旋律换风格、换歌词
              </p>
              <div className="rounded-lg border border-amber-300/60 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
                ⚠️ 请勿使用版权音乐作为参考曲，系统会检测并拒绝。建议使用原创或自录音频。
              </div>
              <div className="space-y-2">
                    <label className={labelCls}>上传参考曲目（必填）</label>
                    <div className="rounded-lg border-2 border-dashed border-amber-300/60 p-4 dark:border-amber-700/40 space-y-4">
                      <div className="flex items-center gap-4">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="refInputSource"
                            checked={referenceInputSource === "file"}
                            onChange={() => {
                              setReferenceInputSource("file");
                              setReferenceUrlInput("");
                              setReferenceUrlError(null);
                              if (referenceInputSource === "url") setReferenceFileUrl(null);
                            }}
                            className="text-amber-500"
                          />
                          <span className="text-sm">本地上传</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="refInputSource"
                            checked={referenceInputSource === "url"}
                            onChange={() => {
                              setReferenceInputSource("url");
                              setReferenceFileUrl(null);
                            }}
                            className="text-amber-500"
                          />
                          <span className="text-sm">粘贴链接</span>
                        </label>
                      </div>
                      {referenceInputSource === "file" ? (
                        <div>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setReferenceUploading(true);
                              setReferenceStatus(null);
                              setReferenceUrlError(null);
                              try {
                                const { blob, fileName } = await prepareAudioForUpload(file, (status, percent) => {
                                  setReferenceStatus(status + (percent != null ? ` ${percent}%` : ""));
                                });
                                setReferenceStatus("上传中…");
                                const formData = new FormData();
                                formData.append("file", new File([blob], fileName, { type: "audio/mpeg" }));
                                const res = await fetch("/api/suno/upload-audio", {
                                  method: "POST",
                                  body: formData,
                                });
                                const j = await res.json();
                                if (j.error) throw new Error(j.error);
                                setReferenceFileUrl(j.fileUrl);
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "上传失败");
                              } finally {
                                setReferenceUploading(false);
                                setReferenceStatus(null);
                              }
                            }}
                            disabled={referenceUploading || isGenerating}
                            className="text-sm"
                          />
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400/80">
                            {referenceStatus || "支持 MP3/WAV 直传，FLAC/OGG/M4A 等将自动转为 MP3"}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={referenceUrlInput}
                              onChange={(e) => {
                                setReferenceUrlInput(e.target.value);
                                setReferenceUrlError(null);
                              }}
                              placeholder="https://example.com/audio.mp3"
                              disabled={referenceUrlLoading || isGenerating}
                              className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                            />
                            <button
                              type="button"
                              onClick={() => referenceUrlInput.trim() && fetchReferenceFromUrl(referenceUrlInput)}
                              disabled={!referenceUrlInput.trim() || referenceUrlLoading || isGenerating}
                              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              {referenceUrlLoading ? "获取中…" : "获取"}
                            </button>
                          </div>
                          {referenceUrlError && (
                            <p className="text-xs text-red-500 dark:text-red-400">{referenceUrlError}</p>
                          )}
                          <p className="text-xs text-amber-600 dark:text-amber-400/80">
                            支持公网音频直链（如 .mp3、.wav）。网易云、QQ 音乐等平台链接通常无法使用。
                          </p>
                        </div>
                      )}
                      {referenceFileUrl && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">已就绪，URL 有效 3 天</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>新歌词 / 风格描述</label>
                    <textarea
                      value={form.prompt}
                      onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                      placeholder="填写新歌词或描述目标风格，AI 将按此翻唱"
                      rows={4}
                      className={inputCls}
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>目标风格</label>
                    <input
                      type="text"
                      value={form.style}
                      onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
                      placeholder="如：藏族民谣、Tibetan folk"
                      className={inputCls}
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>标题</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="翻唱后的标题"
                      className={inputCls}
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>模型版本</label>
                    <select
                      value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                      className={inputCls}
                      disabled={isGenerating}
                    >
                      {REFERENCE_MODEL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}（参考曲{m.refLimit}）
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400/80">
                      V4.5-all 参考曲限 1 分钟，其他模型限 8 分钟
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "藏族风格", style: "Tibetan folk, Himalayan vocal quality, traditional" },
                      { label: "蒙古族风格", style: "Mongolian throat singing, nomadic, epic" },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, style: p.style }))}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
              <button
                type="button"
                onClick={handleReferenceCover}
                disabled={!referenceFileUrl || !form.prompt.trim() || !form.style.trim() || !form.title.trim() || isGenerating || referenceUrlLoading}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
              >
                {referenceUploading || referenceUrlLoading ? (referenceStatus || "处理中…") : isGenerating ? "翻唱中…" : "开始翻唱"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              创作参数
            </h2>
            <button
              type="button"
              onClick={applyBriefToForm}
              disabled={isGenerating}
              className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30 disabled:opacity-50"
            >
              从 Brief 带入
            </button>
          </div>
          <div className="max-h-[calc(100vh-280px)] space-y-4 overflow-y-auto pr-1">
            {/* 歌词模式 */}
            <div className="space-y-2">
              <label className={labelCls}>歌词模式</label>
              <div className="space-y-2">
                {LYRIC_MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      form.lyricMode === opt.value
                        ? "border-amber-500 bg-amber-50/80 dark:border-amber-600 dark:bg-amber-900/30"
                        : "border-amber-200/60 hover:border-amber-300 dark:border-amber-800/40 dark:hover:border-amber-700/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="lyricMode"
                      value={opt.value}
                      checked={form.lyricMode === opt.value}
                      onChange={() =>
                        setForm((f) => ({ ...f, lyricMode: opt.value }))
                      }
                      disabled={isGenerating}
                      className="mt-1 text-amber-500"
                    />
                    <div>
                      <span className="font-medium text-amber-900 dark:text-amber-100">
                        {opt.label}
                      </span>
                      <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400/80">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-amber-600/90 dark:text-amber-400/70">
                {form.lyricMode === "strict"
                  ? "此模式下歌词将按您输入的原样演唱，版本列表显示您填写的歌词。"
                  : "此模式下 AI 将根据描述生成歌词，版本列表会优先显示 API 返回的改编歌词（若 API 支持）。"}
              </p>
            </div>

            {/* 模型 */}
            <div>
              <label className={labelCls}>模型版本</label>
              <select
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className={inputCls}
                disabled={isGenerating}
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt / 歌词 */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={labelCls}>
                  {form.lyricMode === "strict" ? "歌词" : "描述 / 创意"} <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setAiLyricsOpen(true)}
                  className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  AI 写词
                </button>
              </div>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder={
                  form.lyricMode === "strict"
                    ? "填写完整歌词，将严格按原样使用。支持 [Verse] [Chorus] [Pre-Chorus] [Bridge] [Intro] [Outro]"
                    : "描述歌曲风格、情绪、场景，AI 将根据描述生成歌词（≤500字）"
                }
                rows={5}
                className={inputCls}
                disabled={isGenerating}
              />
              {form.lyricMode === "strict" && (
                <>
                  <p className="mt-1.5 text-xs text-amber-500 dark:text-amber-500/80">
                    {LYRIC_STRUCTURE_HINT}
                  </p>
                  {form.prompt.trim() && !hasStructureTags(form.prompt) && (
                    <p className="mt-1 text-xs text-amber-600/90 dark:text-amber-400/70">
                      提示：未检测到 [Verse]/[Chorus] 等结构标签，易导致旋律单一、高潮不突出，建议按推荐结构添加
                    </p>
                  )}
                </>
              )}
            </div>

            {/* 风格 */}
            <div>
              <label className={labelCls}>风格</label>
              <div className="space-y-2">
                <select
                  value={form.style}
                  onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.styleExtra}
                    onChange={(e) => setForm((f) => ({ ...f, styleExtra: e.target.value }))}
                    placeholder="补充风格描述（可选）"
                    className={inputCls}
                    disabled={isGenerating}
                  />
                  <button
                    type="button"
                    disabled={isGenerating || boostStyleLoading}
                    onClick={async () => {
                      const content = form.styleExtra.trim() || form.style || "";
                      if (!content) {
                        alert("请先填写风格或补充描述");
                        return;
                      }
                      setBoostStyleLoading(true);
                      try {
                        const res = await fetch("/api/suno/boost-style", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ content }),
                        });
                        const data = await res.json();
                        if (data.error) throw new Error(data.error);
                        setForm((f) => ({ ...f, styleExtra: data.result || content }));
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "风格增强失败");
                      } finally {
                        setBoostStyleLoading(false);
                      }
                    }}
                    className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50"
                  >
                    {boostStyleLoading ? "优化中…" : "一键优化"}
                  </button>
                </div>
              </div>
            </div>

            {/* 标题 */}
            <div>
              <label className={labelCls}>标题</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="歌曲标题"
                className={inputCls}
                disabled={isGenerating}
              />
            </div>

            {/* 年代 */}
            <div>
              <label className={labelCls}>年代</label>
              <div className="space-y-2">
                <select
                  value={form.eraId}
                  onChange={(e) => setForm((f) => ({ ...f, eraId: e.target.value }))}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  {ERA_OPTIONS.map((opt) => (
                    <option key={opt.id || "none"} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.eraExtra}
                  onChange={(e) => setForm((f) => ({ ...f, eraExtra: e.target.value }))}
                  placeholder="补充年代描述（可选）"
                  className={inputCls}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* 场景 */}
            <div>
              <label className={labelCls}>使用场景</label>
              <div className="space-y-2">
                <select
                  value={form.sceneId}
                  onChange={(e) => setForm((f) => ({ ...f, sceneId: e.target.value }))}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  {SCENE_OPTIONS.map((s) => (
                    <option key={s.id || "none"} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.sceneExtra}
                  onChange={(e) => setForm((f) => ({ ...f, sceneExtra: e.target.value }))}
                  placeholder="补充场景描述（可选）"
                  className={inputCls}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* 心情 */}
            <div>
              <label className={labelCls}>情绪 / 心情</label>
              <div className="space-y-2">
                <select
                  value={form.mood}
                  onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  <option value="">无</option>
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m.mood} value={m.mood}>
                      {m.mood} ({m.style})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.moodExtra}
                  onChange={(e) => setForm((f) => ({ ...f, moodExtra: e.target.value }))}
                  placeholder="补充情绪描述（可选）"
                  className={inputCls}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* 人声 */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>人声性别</label>
                  <select
                    value={form.vocalGender}
                    onChange={(e) => setForm((f) => ({ ...f, vocalGender: e.target.value }))}
                    className={inputCls}
                    disabled={isGenerating}
                  >
                    {VOCAL_GENDER_OPTIONS.map((o) => (
                      <option key={o.value || "any"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>声线</label>
                  <select
                    value={form.vocalToneId}
                    onChange={(e) => setForm((f) => ({ ...f, vocalToneId: e.target.value }))}
                    className={inputCls}
                    disabled={isGenerating}
                  >
                    {VOCAL_TONE_OPTIONS.map((o) => (
                      <option key={o.id || "none"} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={form.vocalExtra}
                onChange={(e) => setForm((f) => ({ ...f, vocalExtra: e.target.value }))}
                placeholder="补充人声描述（可选）"
                className={inputCls}
                disabled={isGenerating}
              />
            </div>

            {/* 乐器 */}
            <div>
              <label className={labelCls}>主奏乐器</label>
              <div className="space-y-2">
                <select
                  value={form.instrumentId}
                  onChange={(e) => setForm((f) => ({ ...f, instrumentId: e.target.value }))}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  {INSTRUMENT_OPTIONS.map((o) => (
                    <option key={o.id || "none"} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.instrumentExtra}
                  onChange={(e) => setForm((f) => ({ ...f, instrumentExtra: e.target.value }))}
                  placeholder="补充乐器描述（可选）"
                  className={inputCls}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* 语言 */}
            <div>
              <label className={labelCls}>歌词语言</label>
              <select
                value={form.languageId}
                onChange={(e) => setForm((f) => ({ ...f, languageId: e.target.value }))}
                className={inputCls}
                disabled={isGenerating}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 民族风格 */}
            <div>
              <label className={labelCls}>民族风格</label>
              <div className="space-y-2">
                <select
                  value={form.ethnicId}
                  onChange={(e) => setForm((f) => ({ ...f, ethnicId: e.target.value }))}
                  className={inputCls}
                  disabled={isGenerating}
                >
                  {ETHNIC_OPTIONS.map((o) => (
                    <option key={o.id || "none"} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.ethnicExtra}
                  onChange={(e) => setForm((f) => ({ ...f, ethnicExtra: e.target.value }))}
                  placeholder="补充民族风格描述（可选）"
                  className={inputCls}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* 纯音乐 */}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.instrumental}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instrumental: e.target.checked }))
                }
                disabled={isGenerating}
                className="rounded text-amber-500"
              />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                纯音乐（无人声）
              </span>
            </label>

            {/* 高级参数 */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, showAdvanced: !f.showAdvanced }))
                }
                className="text-sm text-amber-600 hover:underline dark:text-amber-400"
              >
                {form.showAdvanced ? "收起" : "展开"} 高级参数
              </button>
              {form.showAdvanced && (
                <div className="mt-3 space-y-3 rounded-lg border border-amber-200/50 p-3 dark:border-amber-800/30">
                  <div>
                    <label className={labelCls}>
                      排除风格 (negativeTags)
                    </label>
                    <input
                      type="text"
                      value={form.negativeTags}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, negativeTags: e.target.value }))
                      }
                      placeholder="如：重金属, 强节奏鼓点"
                      className={inputCls}
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      风格权重 styleWeight: {form.styleWeight}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={form.styleWeight}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          styleWeight: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      创意发散 weirdnessConstraint: {form.weirdnessConstraint}
                      {form.weirdnessConstraint > 0.6 && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400">
                          （偏高，输出可能更实验性）
                        </span>
                      )}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={form.weirdnessConstraint}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          weirdnessConstraint: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              )}
            </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
            >
              {isGenerating ? "生成中..." : "开始生成"}
            </button>
            </div>
          )}
        </div>

        {/* 中：生成任务 */}
        <div className="rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
          <h2 className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
            生成任务
          </h2>
          <p className="mb-3 text-[10px] text-amber-500 dark:text-amber-500/80">
            点击任务 → 右侧即显示该任务生成的歌曲
          </p>
          {currentTask && isGenerating ? (
            <div className="space-y-3 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
              <div className="flex justify-between text-sm">
                <span className="text-amber-800 dark:text-amber-200">
                  正在生成 2 首歌曲...
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {currentTask.progress}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-800/50">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${currentTask.progress}%` }}
                />
              </div>
              <div className="max-h-24 overflow-y-auto rounded border border-amber-200/40 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300 dark:border-amber-700/40 whitespace-pre-wrap break-words">
                {currentTask.prompt}
              </div>
              {/* 生成中：2 首歌曲占位 */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300/60 p-2 dark:border-amber-700/40"
                  >
                    <div className="w-10 h-10 rounded bg-amber-100/50 dark:bg-zinc-800 flex items-center justify-center animate-pulse">
                      <span className="text-amber-400/40">♪</span>
                    </div>
                    <p className="text-xs text-amber-500">生成中...</p>
                  </div>
                ))}
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400/80">
              暂无任务，点击「开始生成」创建
            </p>
          ) : (
            <ul className="max-h-[calc(100vh-280px)] space-y-2 overflow-y-auto pr-1">
              {tasks.map((t) => {
                const versionIds =
                  t.resultVersionIds ??
                  (t.resultVersionId ? [t.resultVersionId] : []);
                const resultVersions = versionIds
                  .map((id) => getVersionById(id))
                  .filter(Boolean) as SongVersion[];
                const versionNos = resultVersions.map((v) => v.versionNo).join(", ");
                const isSelected = selectedTaskId === t.id;
                return (
                  <li
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTaskId(null);
                      } else {
                        setSelectedTaskId(t.id);
                        if (t.creationForm && Object.keys(t.creationForm).length > 0) {
                          setForm((prev) => ({
                            ...prev,
                            ...(t.creationForm as Partial<FormState>),
                          }));
                        } else {
                          setForm((prev) => ({
                            ...prev,
                            prompt: t.prompt || prev.prompt,
                            style: t.style || prev.style,
                            title: t.title || prev.title,
                          }));
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isSelected) {
                          setSelectedTaskId(null);
                        } else {
                          setSelectedTaskId(t.id);
                          if (t.creationForm && Object.keys(t.creationForm).length > 0) {
                            setForm((prev) => ({
                              ...prev,
                              ...(t.creationForm as Partial<FormState>),
                            }));
                          } else {
                            setForm((prev) => ({
                              ...prev,
                              prompt: t.prompt || prev.prompt,
                              style: t.style || prev.style,
                              title: t.title || prev.title,
                            }));
                          }
                        }
                      }
                    }}
                    className={`rounded-lg border px-2.5 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/30 dark:border-amber-500 dark:bg-amber-900/20 dark:ring-amber-500/20"
                        : "border-amber-200/50 hover:border-amber-300/60 dark:border-amber-800/30 dark:hover:border-amber-700/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`font-medium ${
                          t.status === "completed"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : t.status === "failed"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {t.status === "pending"
                          ? "等待中"
                          : t.status === "running"
                            ? "生成中"
                            : t.status === "completed"
                              ? "已完成"
                              : "失败"}
                      </span>
                      <div className="flex items-center gap-2">
                        {t.completedAt && (
                          <span className="text-xs text-amber-500">
                            {new Date(t.completedAt).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm("确定要删除此任务记录吗？已生成的版本不会受影响。")) return;
                            if (deleteTask(t.id)) {
                              if (selectedTaskId === t.id) setSelectedTaskId(null);
                              loadData();
                            }
                          }}
                          className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                          title="删除此任务记录"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <p className="mt-0.5 truncate font-medium text-amber-900 dark:text-amber-100">
                      {t.title || "未命名"}
                    </p>
                    {versionNos && (
                      <p className="mt-0.5 text-amber-500">→ {versionNos}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 右：版本列表（紧邻任务，点任务即见歌曲） */}
        <div className="rounded-xl border border-amber-200/60 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                版本列表
              </h2>
              <p className="text-xs text-amber-500 dark:text-amber-500/80">
                {selectedTaskId
                  ? (() => {
                      const t = tasks.find((x) => x.id === selectedTaskId);
                      const cnt = t?.resultVersionIds?.length ?? (t?.resultVersionId ? 1 : 0);
                      return `${t?.title || "该任务"} 的 ${cnt} 首歌曲（点击左侧可切换任务）`;
                    })()
                  : "试听、选稿、深度编辑、标记最终版"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedTaskId && (
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  显示全部
                </button>
              )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-amber-600 dark:text-amber-400">歌词字体：</span>
              {(["sm", "base", "lg"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setLyricFontSize(s)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    lyricFontSize === s
                      ? "bg-amber-500 text-white"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
                  }`}
                >
                  {s === "sm" ? "小" : s === "base" ? "中" : "大"}
                </button>
              ))}
            </div>
            </div>
          </div>
          {displayedVersions.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400/80">
              {selectedTaskId ? "该任务暂无生成的版本" : "暂无版本，生成后将显示在此"}
            </p>
          ) : (
            <ul className="space-y-3">
              {displayedVersions.map((v) => (
                <li
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("button")) {
                      setSelectedVersionId(v.id === selectedVersionId ? null : v.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedVersionId(v.id === selectedVersionId ? null : v.id);
                    }
                  }}
                  className={`rounded-lg border overflow-hidden cursor-pointer transition-colors ${
                    selectedVersionId === v.id
                      ? "border-amber-500 ring-2 ring-amber-500/30 dark:border-amber-500 dark:ring-amber-500/20"
                      : "border-amber-200/50 dark:border-amber-800/30 hover:border-amber-300/60"
                  }`}
                >
                  {/* 封面 + 信息 */}
                  <div className="flex gap-3 p-3">
                    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-amber-100/50 dark:bg-zinc-800 flex items-center justify-center">
                      {v.coverUrl ? (
                        <img
                          src={v.coverUrl}
                          alt={v.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-amber-400/60">♪</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-amber-900 dark:text-amber-100">
                            {v.versionNo}
                          </span>
                          <span className="ml-2 text-sm text-amber-600 dark:text-amber-400/80">
                            {v.title}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                            v.status === "final"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : v.status === "candidate" || v.isCandidate
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : v.status === "rejected"
                                  ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400"
                          }`}
                        >
                          {v.isFinal
                            ? "最终版"
                            : v.isSentToCustomer
                              ? "已发客户"
                              : v.isCandidate
                                ? "候选"
                                : v.status === "rejected"
                                  ? "淘汰"
                                  : "草稿"}
                        </span>
                      </div>
                      <div className="mt-2 max-h-56 overflow-y-auto space-y-2 pr-1">
                        {parseLyricsToSegments(
                          stripStyleExtrasFromPrompt(
                            v.lyrics ?? v.prompt ?? ""
                          )
                        ).map((seg, i) => (
                          <div
                            key={i}
                            className={`rounded border border-amber-200/40 px-2.5 py-2 leading-relaxed text-amber-800 dark:text-amber-200 dark:border-amber-700/40 whitespace-pre-wrap break-words ${
                              lyricFontSize === "sm"
                                ? "text-sm"
                                : lyricFontSize === "lg"
                                  ? "text-lg"
                                  : "text-base"
                            }`}
                          >
                            {seg}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* 音频播放器 */}
                  {v.audioUrl ? (
                    <div className="px-3 pb-3">
                      <audio
                        controls
                        src={v.audioUrl}
                        className="w-full h-9"
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <p className="px-3 pb-2 text-xs text-amber-500">
                      （模拟版本，暂无音频）
                    </p>
                  )}
                  <div className="px-3 pb-3 flex flex-wrap gap-2">
                    {v.audioUrl && (
                      <button
                        onClick={() => handleRefreshLyrics(v.id)}
                        disabled={!!refreshingLyricsId}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 disabled:opacity-50"
                      >
                        {refreshingLyricsId === v.id ? "获取中…" : "刷新改编歌词"}
                      </button>
                    )}
                    <button
                      onClick={() => handleVersionAction(v.id, "candidate")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        v.isCandidate
                          ? "bg-amber-200 text-amber-900 dark:bg-amber-800/60 dark:text-amber-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
                      }`}
                    >
                      候选
                    </button>
                    <button
                      onClick={() => handleVersionAction(v.id, "sent")}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200"
                    >
                      发客户
                    </button>
                    <button
                      onClick={() => handleVersionAction(v.id, "reject")}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-400"
                    >
                      淘汰
                    </button>
                    <button
                      onClick={() => handleVersionAction(v.id, "final")}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200"
                    >
                      最终版
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {selectedVersionId && (() => {
            const sel = getVersionById(selectedVersionId);
            if (!sel) return null;
            const params = sel.creationParams;
            const canEdit = !!(sel.sunoTaskId && sel.sunoAudioId);
            return (
              <>
              <div className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
                <h3 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {sel.versionNo} {sel.title} — 创作参数
                </h3>
                {params && Object.keys(params).length > 0 ? (
                  <dl className="space-y-2 text-sm">
                    {Object.entries(params).map(([key, val]) => {
                      if (key === "model" || val === undefined || val === "" || val === "—") return null;
                      const display = typeof val === "boolean" ? (val ? "是" : "否") : String(val);
                      return (
                        <div key={key} className="flex gap-2">
                          <dt className="shrink-0 w-24 text-amber-600 dark:text-amber-400/80">{key}：</dt>
                          <dd className="min-w-0 break-words text-amber-800 dark:text-amber-200">
                            {key === "描述或歌词" ? (
                              <pre className="whitespace-pre-wrap font-sans text-inherit">{display}</pre>
                            ) : (
                              display
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : (
                  <>
                    <p className="text-sm text-amber-600 dark:text-amber-400/80">
                      该版本未保存创作参数。发送的 prompt 与 style 如下：
                    </p>
                    <div className="mt-2 space-y-2 text-xs">
                    <div>
                      <span className="text-amber-600 dark:text-amber-400">prompt：</span>
                      <pre className="mt-0.5 max-h-32 overflow-y-auto rounded border border-amber-200/40 px-2 py-1.5 whitespace-pre-wrap break-words dark:border-amber-700/40">
                        {sel.prompt || "—"}
                      </pre>
                    </div>
                    <div>
                      <span className="text-amber-600 dark:text-amber-400">style：</span>
                      <pre className="mt-0.5 rounded border border-amber-200/40 px-2 py-1.5 break-words dark:border-amber-700/40">
                        {sel.style || "—"}
                      </pre>
                    </div>
                    </div>
                  </>
                )}
              </div>
              {canEdit && (
                <div className="mt-4 rounded-lg border border-violet-200/60 bg-violet-50/50 p-4 dark:border-violet-800/40 dark:bg-violet-900/10">
                  <h3 className="mb-3 text-sm font-semibold text-violet-900 dark:text-violet-100">
                    深度编辑
                  </h3>
                  <p className="mb-3 text-xs text-violet-600 dark:text-violet-400/80">
                    基于当前版本进行延长、替换、人声分离、音乐视频或生成 Persona
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={wavExportLoading}
                      onClick={async () => {
                        if (!sel.sunoTaskId || !sel.sunoAudioId) {
                          alert("该版本缺少 Suno 任务信息，无法导出 WAV");
                          return;
                        }
                        setWavExportLoading(true);
                        setWavExportUrl(null);
                        try {
                          const res = await fetch("/api/suno/convert-wav", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ taskId: sel.sunoTaskId, audioId: sel.sunoAudioId }),
                          });
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          const wavTaskId = data.taskId;
                          const pollInterval = 5000;
                          const maxWait = 3 * 60 * 1000;
                          const start = Date.now();
                          while (Date.now() - start < maxWait) {
                            await new Promise((r) => setTimeout(r, pollInterval));
                            const infoRes = await fetch(`/api/suno/wav-info?taskId=${encodeURIComponent(wavTaskId)}`);
                            const info = await infoRes.json();
                            if (info.status === "SUCCESS" && info.audioWavUrl) {
                              setWavExportUrl(info.audioWavUrl);
                              return;
                            }
                            if (["CREATE_TASK_FAILED", "GENERATE_WAV_FAILED", "CALLBACK_EXCEPTION"].includes(info.status)) {
                              throw new Error(info.errorMessage || "WAV 转换失败");
                            }
                          }
                          throw new Error("WAV 转换超时");
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "WAV 转换失败");
                        } finally {
                          setWavExportLoading(false);
                        }
                      }}
                      className="rounded-lg px-3 py-2 text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-800/50 disabled:opacity-50"
                    >
                      {wavExportLoading ? "转换中…" : "导出 WAV"}
                    </button>
                    {wavExportUrl && selectedVersionId === sel.id && (
                      <a
                        href={wavExportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        下载 WAV
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(EDIT_CAPABILITIES) as EditCapabilityId[]).map((capId) => {
                      const cap = EDIT_CAPABILITIES[capId];
                      const isRunning = currentEditTaskId && editTasks.some(
                        (t) => t.id === currentEditTaskId && t.capabilityId === capId && t.sourceVersionId === sel.id
                      );
                      return (
                        <button
                          key={capId}
                          type="button"
                          disabled={!!currentEditTaskId}
                          onClick={() => {
                            if (capId === "replace") {
                              setEditReplaceForm((f) => ({ ...f, title: sel.title || "" }));
                              setEditModalCapability("replace");
                            } else if (capId === "persona") {
                              setEditModalCapability("persona");
                            } else {
                              setEditConfirmCapability(capId);
                            }
                          }}
                          className="rounded-lg px-3 py-2 text-sm font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:hover:bg-violet-800/50 disabled:opacity-50"
                        >
                          {isRunning ? "处理中…" : cap.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {(() => {
                const completedForVersion = editTasks.filter(
                  (t) => t.sourceVersionId === sel.id && t.status === "completed"
                );
                if (completedForVersion.length === 0) return null;
                return (
                  <div className="mt-4 rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-900/10">
                    <h3 className="mb-3 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      本版本编辑结果
                    </h3>
                    <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400/80">
                      播放、下载或复制链接，随时交付客户
                    </p>
                    <ul className="space-y-3">
                      {completedForVersion.map((et) => {
                        if (et.capabilityId === "musicVideo" && et.videoUrl) {
                          return (
                            <li key={et.id} className="rounded-lg border border-emerald-200/50 bg-white/60 p-3 dark:border-emerald-700/40 dark:bg-zinc-900/40">
                              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                <span>🎬</span> 音乐视频
                              </div>
                              <div className="mb-2 rounded overflow-hidden bg-black/5 dark:bg-black/20">
                                <video src={et.videoUrl} controls className="w-full max-h-48" preload="metadata" />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={et.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                                >
                                  播放
                                </a>
                                <a
                                  href={et.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-800/50"
                                >
                                  下载
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(et.videoUrl!);
                                    alert("链接已复制，可粘贴发给客户");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                                >
                                  复制链接
                                </button>
                              </div>
                            </li>
                          );
                        }
                        if (et.capabilityId === "separate" && et.stems) {
                          const isSplitStem = !!et.separationOriginData?.length;
                          return (
                            <li key={et.id} className="rounded-lg border border-emerald-200/50 bg-white/60 p-3 dark:border-emerald-700/40 dark:bg-zinc-900/40">
                              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                <span>🎤</span> {isSplitStem ? "分轨分离" : "人声分离"}
                              </div>
                              <div className="space-y-2">
                                {et.stems.vocalUrl && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">人声：</span>
                                    <a href={et.stems.vocalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 underline dark:text-emerald-300">播放</a>
                                    <a href={et.stems.vocalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 underline dark:text-emerald-300">下载</a>
                                    <button type="button" onClick={() => { navigator.clipboard.writeText(et.stems!.vocalUrl!); alert("链接已复制"); }} className="text-xs text-emerald-700 underline dark:text-emerald-300">复制</button>
                                  </div>
                                )}
                                {et.stems.instrumentalUrl && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">伴奏：</span>
                                    <a href={et.stems.instrumentalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 underline dark:text-emerald-300">播放</a>
                                    <a href={et.stems.instrumentalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 underline dark:text-emerald-300">下载</a>
                                    <button type="button" onClick={() => { navigator.clipboard.writeText(et.stems!.instrumentalUrl!); alert("链接已复制"); }} className="text-xs text-emerald-700 underline dark:text-emerald-300">复制</button>
                                  </div>
                                )}
                                {isSplitStem && et.sunoTaskId && (
                                  <div className="mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-700/40">
                                    <button
                                      type="button"
                                      disabled={midiExportLoading}
                                      onClick={async () => {
                                        setMidiExportLoading(true);
                                        setMidiExportUrl(null);
                                        setMidiExportForEditTaskId(null);
                                        try {
                                          const res = await fetch("/api/suno/generate-midi", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ taskId: et.sunoTaskId }),
                                          });
                                          const data = await res.json();
                                          if (data.error) throw new Error(data.error);
                                          const midiTaskId = data.taskId;
                                          const pollInterval = 6000;
                                          const maxWait = 5 * 60 * 1000;
                                          const start = Date.now();
                                          while (Date.now() - start < maxWait) {
                                            await new Promise((r) => setTimeout(r, pollInterval));
                                            const infoRes = await fetch(`/api/suno/midi-info?taskId=${encodeURIComponent(midiTaskId)}`);
                                            const info = await infoRes.json();
                                            const status = info.status ?? info.successFlag;
                                            const midiUrl = info.midiUrl ?? info.response?.midiUrl ?? info.data?.midiUrl;
                                            const midiData = info.midiData;
                                            if (status === "SUCCESS") {
                                              if (midiUrl) {
                                                setMidiExportUrl(midiUrl);
                                              } else if (midiData) {
                                                const blob = new Blob([JSON.stringify(midiData, null, 2)], { type: "application/json" });
                                                setMidiExportUrl(URL.createObjectURL(blob));
                                              } else {
                                                throw new Error("MIDI 生成完成但未返回数据");
                                              }
                                              setMidiExportForEditTaskId(et.id);
                                              return;
                                            }
                                            if (["CREATE_TASK_FAILED", "GENERATE_MIDI_FAILED", "CALLBACK_EXCEPTION", 2, 3].includes(status as string | number)) {
                                              throw new Error(info.errorMessage || "MIDI 生成失败");
                                            }
                                          }
                                          throw new Error("MIDI 生成超时");
                                        } catch (e) {
                                          alert(e instanceof Error ? e.message : "MIDI 生成失败");
                                        } finally {
                                          setMidiExportLoading(false);
                                        }
                                      }}
                                      className="rounded px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50"
                                    >
                                      {midiExportLoading ? "生成中…" : "生成 MIDI"}
                                    </button>
                                    {midiExportUrl && midiExportForEditTaskId === et.id && (
                                      <a href={midiExportUrl} target="_blank" rel="noopener noreferrer" download="midi-data.json" className="ml-2 text-xs text-emerald-700 underline dark:text-emerald-300">下载 MIDI 数据</a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        }
                        if (et.capabilityId === "persona" && et.personaId) {
                          return (
                            <li key={et.id} className="rounded-lg border border-emerald-200/50 bg-white/60 p-3 dark:border-emerald-700/40 dark:bg-zinc-900/40">
                              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                <span>👤</span> Persona
                              </div>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                {et.personaName || "—"} · ID: {et.personaId}
                              </p>
                            </li>
                          );
                        }
                        if ((et.capabilityId === "extend" || et.capabilityId === "replace") && et.resultVersionIds?.length) {
                          const newVers = et.resultVersionIds.map((id) => getVersionById(id)).filter(Boolean) as SongVersion[];
                          return (
                            <li key={et.id} className="rounded-lg border border-emerald-200/50 bg-white/60 p-3 dark:border-emerald-700/40 dark:bg-zinc-900/40">
                              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                <span>{et.capabilityId === "extend" ? "⏩" : "🔄"}</span>
                                {EDIT_CAPABILITIES[et.capabilityId as EditCapabilityId]?.label || et.capabilityId}
                              </div>
                              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                                已生成：{newVers.map((v) => v.versionNo).join(", ")}
                              </p>
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                );
              })()}
              {editConfirmCapability && (editConfirmCapability === "extend" || editConfirmCapability === "separate" || editConfirmCapability === "musicVideo") && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-w-md w-full rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                    <h3 className="mb-3 text-lg font-semibold text-violet-900 dark:text-violet-100">
                      {EDIT_CAPABILITIES[editConfirmCapability].label}
                    </h3>
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {EDIT_CAPABILITIES[editConfirmCapability].confirmDetail}
                    </p>
                    {editConfirmCapability === "separate" && (
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-violet-800 dark:text-violet-200">分离类型</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSeparateType("separate_vocal")}
                            className={`rounded-lg px-3 py-2 text-sm ${separateType === "separate_vocal" ? "bg-violet-500 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"}`}
                          >
                            人声/伴奏
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeparateType("split_stem")}
                            className={`rounded-lg px-3 py-2 text-sm ${separateType === "split_stem" ? "bg-violet-500 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"}`}
                          >
                            分轨分离（可生成 MIDI）
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="mb-4 text-xs text-amber-600 dark:text-amber-400/80">
                      确认后将开始处理，请勿关闭页面。
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditConfirmCapability(null)}
                        className="rounded-lg px-4 py-2 text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editConfirmCapability === "separate") {
                            handleRunEdit("separate", { type: separateType });
                          } else if (editConfirmCapability === "musicVideo") {
                            handleRunEdit("musicVideo", undefined);
                          } else {
                            handleRunEdit(editConfirmCapability, undefined);
                          }
                          setEditConfirmCapability(null);
                        }}
                        className="rounded-lg px-4 py-2 text-sm bg-violet-500 text-white hover:bg-violet-600"
                      >
                        确认执行
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {editModalCapability === "replace" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-w-md w-full rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                    <h3 className="mb-2 text-lg font-semibold text-amber-900 dark:text-amber-100">替换音乐分区</h3>
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {EDIT_CAPABILITIES.replace.confirmDetail}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>开始秒数 (6–60)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={6}
                          max={60}
                          value={editReplaceForm.infillStartS}
                          onChange={(e) => setEditReplaceForm((f) => ({ ...f, infillStartS: Number(e.target.value) }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>结束秒数 (6–60)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={6}
                          max={60}
                          value={editReplaceForm.infillEndS}
                          onChange={(e) => setEditReplaceForm((f) => ({ ...f, infillEndS: Number(e.target.value) }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>替换内容描述 (prompt)</label>
                        <input
                          type="text"
                          value={editReplaceForm.prompt}
                          onChange={(e) => setEditReplaceForm((f) => ({ ...f, prompt: e.target.value }))}
                          placeholder="描述该段落应有的音乐内容"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>风格标签 (tags)</label>
                        <input
                          type="text"
                          value={editReplaceForm.tags}
                          onChange={(e) => setEditReplaceForm((f) => ({ ...f, tags: e.target.value }))}
                          placeholder="如：Jazz, emotional"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>标题</label>
                        <input
                          type="text"
                          value={editReplaceForm.title}
                          onChange={(e) => setEditReplaceForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder={sel.title}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditModalCapability(null)}
                        className="rounded-lg px-4 py-2 text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const { infillStartS, infillEndS, prompt, tags, title } = editReplaceForm;
                          if (!prompt.trim() || !tags.trim() || !title.trim()) {
                            alert("请填写 prompt、tags 和 title");
                            return;
                          }
                          if (infillStartS < 6 || infillStartS > 60 || infillEndS < 6 || infillEndS > 60) {
                            alert("开始/结束秒数需在 6–60 秒范围内");
                            return;
                          }
                          if (infillStartS >= infillEndS) {
                            alert("开始秒数必须小于结束秒数");
                            return;
                          }
                          handleRunEdit("replace", editReplaceForm);
                        }}
                        className="rounded-lg px-4 py-2 text-sm bg-amber-500 text-white hover:bg-amber-600"
                      >
                        执行替换
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {editModalCapability === "persona" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-w-md w-full rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                    <h3 className="mb-2 text-lg font-semibold text-amber-900 dark:text-amber-100">生成 Persona</h3>
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {EDIT_CAPABILITIES.persona.confirmDetail}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Persona 名称</label>
                        <input
                          type="text"
                          value={editPersonaForm.name}
                          onChange={(e) => setEditPersonaForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="如：藏族男声"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>风格描述</label>
                        <textarea
                          value={editPersonaForm.description}
                          onChange={(e) => setEditPersonaForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="描述人声特点、风格、情绪等"
                          rows={3}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>风格标签（可选）</label>
                        <input
                          type="text"
                          value={editPersonaForm.style}
                          onChange={(e) => setEditPersonaForm((f) => ({ ...f, style: e.target.value }))}
                          placeholder="如：Tibetan folk"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditModalCapability(null)}
                        className="rounded-lg px-4 py-2 text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!editPersonaForm.name.trim() || !editPersonaForm.description.trim()) {
                            alert("请填写名称和风格描述");
                            return;
                          }
                          handleRunEdit("persona", editPersonaForm);
                        }}
                        className="rounded-lg px-4 py-2 text-sm bg-amber-500 text-white hover:bg-amber-600"
                      >
                        生成 Persona
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {aiLyricsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-w-lg w-full rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                    <h3 className="mb-3 text-lg font-semibold text-amber-900 dark:text-amber-100">AI 写词</h3>
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                      输入主题或风格描述（≤200字），AI 将生成多首歌词供选择
                    </p>
                    {aiLyricsItems.length === 0 ? (
                      <>
                        <textarea
                          value={aiLyricsPrompt}
                          onChange={(e) => setAiLyricsPrompt(e.target.value.slice(0, 200))}
                          placeholder="如：古风仙侠、江湖恩怨、仗剑天涯"
                          rows={3}
                          className={inputCls}
                          disabled={aiLyricsLoading}
                        />
                        <p className="mt-1 text-xs text-zinc-500">{aiLyricsPrompt.length}/200</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setAiLyricsOpen(false); setAiLyricsPrompt(""); setAiLyricsItems([]); }}
                            className="rounded-lg px-4 py-2 text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            disabled={!aiLyricsPrompt.trim() || aiLyricsLoading}
                            onClick={async () => {
                              setAiLyricsLoading(true);
                              setAiLyricsItems([]);
                              try {
                                const res = await fetch("/api/suno/generate-lyrics", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ prompt: aiLyricsPrompt.trim() }),
                                });
                                const data = await res.json();
                                if (data.error) throw new Error(data.error);
                                const taskId = data.taskId;
                                const pollInterval = 4000;
                                const maxWait = 2 * 60 * 1000;
                                const start = Date.now();
                                while (Date.now() - start < maxWait) {
                                  await new Promise((r) => setTimeout(r, pollInterval));
                                  const infoRes = await fetch(`/api/suno/lyrics-info?taskId=${encodeURIComponent(taskId)}`);
                                  const info = await infoRes.json();
                                  if (info.status === "SUCCESS" && info.items?.length) {
                                    setAiLyricsItems(info.items.filter((x: { text?: string }) => x.text?.trim()).map((x: { text?: string; title?: string }) => ({ text: x.text ?? "", title: x.title ?? "" })));
                                    return;
                                  }
                                  if (["CREATE_TASK_FAILED", "GENERATE_LYRICS_FAILED", "CALLBACK_EXCEPTION", "SENSITIVE_WORD_ERROR"].includes(info.status)) {
                                    throw new Error(info.errorMessage || "歌词生成失败");
                                  }
                                }
                                throw new Error("歌词生成超时");
                              } catch (e) {
                                alert(e instanceof Error ? e.message : "歌词生成失败");
                              } finally {
                                setAiLyricsLoading(false);
                              }
                            }}
                            className="rounded-lg px-4 py-2 text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            {aiLyricsLoading ? "生成中…" : "生成歌词"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="max-h-64 overflow-y-auto space-y-3">
                          {aiLyricsItems.map((item, i) => (
                            <div key={i} className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 dark:border-amber-700/40 dark:bg-amber-900/10">
                              <div className="mb-1 text-sm font-medium text-amber-800 dark:text-amber-200">{item.title || `变体 ${i + 1}`}</div>
                              <pre className="whitespace-pre-wrap text-xs text-amber-900/90 dark:text-amber-100/90 font-sans">{item.text}</pre>
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((f) => ({ ...f, prompt: item.text, lyricMode: "strict" }));
                                  setAiLyricsOpen(false);
                                  setAiLyricsItems([]);
                                  setAiLyricsPrompt("");
                                }}
                                className="mt-2 rounded px-2 py-1 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600"
                              >
                                填入歌词
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setAiLyricsItems([]); }}
                            className="rounded-lg px-4 py-2 text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                          >
                            重新生成
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAiLyricsOpen(false); setAiLyricsItems([]); setAiLyricsPrompt(""); }}
                            className="rounded-lg px-4 py-2 text-sm bg-amber-500 text-white hover:bg-amber-600"
                          >
                            关闭
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              </>
            );
          })()}
          {editTasks.length > 0 && (
            <details className="mt-4 rounded-lg border border-violet-200/40 dark:border-violet-700/30">
              <summary className="cursor-pointer px-3 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20">
                最近编辑（音乐视频、人声分离等）点击跳转版本
              </summary>
              <ul className="border-t border-violet-200/40 dark:border-violet-700/30 p-2 space-y-1 max-h-32 overflow-y-auto">
                {editTasks.slice(0, 6).map((et) => {
                  const srcV = getVersionById(et.sourceVersionId);
                  const cap = EDIT_CAPABILITIES[et.capabilityId as EditCapabilityId];
                  return (
                    <li
                      key={et.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { srcV && setSelectedVersionId(et.sourceVersionId); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); srcV && setSelectedVersionId(et.sourceVersionId); } }}
                      className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-violet-50/50 dark:hover:bg-violet-900/20 cursor-pointer"
                    >
                      <span className="text-violet-700 dark:text-violet-300">{cap?.label ?? et.capabilityId}</span>
                      <span className="text-violet-500 dark:text-violet-400 truncate">{srcV ? `${srcV.versionNo} ${srcV.title}` : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
