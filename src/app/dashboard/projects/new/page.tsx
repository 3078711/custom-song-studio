"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createProject,
  type ProjectType,
  type ProjectPriority,
  type ProjectBrief,
} from "@/lib/projects";
import { listCustomers } from "@/lib/customers";

const PROJECT_TYPES: ProjectType[] = [
  "定制歌曲",
  "翻唱",
  "纪念曲",
  "生日歌",
  "表白曲",
  "其他",
];
const PRIORITY_OPTIONS: ProjectPriority[] = ["普通", "加急"];

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") ?? "";

  const [customers, setCustomers] = useState<ReturnType<typeof listCustomers>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: preselectedCustomerId,
    projectName: "",
    projectType: "定制歌曲" as ProjectType,
    priority: "普通" as ProjectPriority,
    scenario: "",
    includeVideo: false,
    budget: "",
    targetDeliveryDate: "",
    summary: "",
    brief: {} as ProjectBrief,
  });

  useEffect(() => {
    setCustomers(listCustomers());
    if (preselectedCustomerId) {
      setForm((f) => ({ ...f, customerId: preselectedCustomerId }));
    }
  }, [preselectedCustomerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.projectName.trim()) {
      setError("请输入项目名称");
      return;
    }
    if (!form.customerId) {
      setError("请选择关联客户");
      return;
    }
    setIsSubmitting(true);
    try {
      const brief: ProjectBrief = {};
      if (form.brief.stylePreference?.trim())
        brief.stylePreference = form.brief.stylePreference.trim();
      if (form.brief.moodScene?.trim())
        brief.moodScene = form.brief.moodScene.trim();
      if (form.brief.lyricDirection?.trim())
        brief.lyricDirection = form.brief.lyricDirection.trim();
      if (form.brief.referenceTracks?.trim())
        brief.referenceTracks = form.brief.referenceTracks.trim();
      if (form.brief.referenceTrackUrl?.trim())
        brief.referenceTrackUrl = form.brief.referenceTrackUrl.trim();
      if (form.brief.specialRequirements?.trim())
        brief.specialRequirements = form.brief.specialRequirements.trim();
      if (form.brief.freeDescription?.trim())
        brief.freeDescription = form.brief.freeDescription.trim();

      const project = createProject({
        customerId: form.customerId,
        projectName: form.projectName.trim(),
        projectType: form.projectType,
        status: "pending_communication",
        priority: form.priority,
        scenario: form.scenario.trim() || undefined,
        includeVideo: form.includeVideo,
        budget: form.budget.trim() || undefined,
        targetDeliveryDate: form.targetDeliveryDate || undefined,
        summary: form.summary.trim() || undefined,
        brief: Object.keys(brief).length > 0 ? brief : undefined,
      });
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) {
      setError("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/dashboard/projects"
        className="text-amber-600 hover:underline dark:text-amber-400"
      >
        ← 返回列表
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
          新建项目
        </h1>
        <p className="mt-1 text-amber-700/80 dark:text-amber-300/70">
          填写项目基本信息
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              关联客户 <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.customerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerId: e.target.value }))
              }
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
              disabled={isSubmitting}
            >
              <option value="">请选择客户</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ""}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                暂无客户，请先{" "}
                <Link
                  href="/dashboard/customers/new"
                  className="underline hover:text-amber-700"
                >
                  新建客户
                </Link>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              项目名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) =>
                setForm((f) => ({ ...f, projectName: e.target.value }))
              }
              placeholder="如：张小姐生日歌"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              项目类型
            </label>
            <select
              value={form.projectType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  projectType: e.target.value as ProjectType,
                }))
              }
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
              disabled={isSubmitting}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              优先级
            </label>
            <div className="flex gap-4">
              {PRIORITY_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={opt}
                    checked={form.priority === opt}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        priority: opt as ProjectPriority,
                      }))
                    }
                    disabled={isSubmitting}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-amber-800 dark:text-amber-200">
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              使用场景
            </label>
            <input
              type="text"
              value={form.scenario}
              onChange={(e) =>
                setForm((f) => ({ ...f, scenario: e.target.value }))
              }
              placeholder="如：生日祝福、结婚纪念"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.includeVideo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includeVideo: e.target.checked }))
                }
                disabled={isSubmitting}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                包含视频
              </span>
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              预算
            </label>
            <input
              type="text"
              value={form.budget}
              onChange={(e) =>
                setForm((f) => ({ ...f, budget: e.target.value }))
              }
              placeholder="如：500-800"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              预计交付时间
            </label>
            <input
              type="date"
              value={form.targetDeliveryDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetDeliveryDate: e.target.value }))
              }
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
              项目摘要
            </label>
            <textarea
              value={form.summary}
              onChange={(e) =>
                setForm((f) => ({ ...f, summary: e.target.value }))
              }
              placeholder="简要描述项目需求..."
              rows={3}
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
              disabled={isSubmitting}
            />
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-amber-800 dark:text-amber-200">
              需求 Brief（可选，可后续在项目详情中补充）
            </summary>
            <div className="mt-3 space-y-3 pl-2">
              <input
                type="text"
                value={form.brief?.stylePreference ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, stylePreference: e.target.value },
                  }))
                }
                placeholder="风格偏好"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={form.brief?.moodScene ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, moodScene: e.target.value },
                  }))
                }
                placeholder="情绪/场景"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={form.brief?.lyricDirection ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, lyricDirection: e.target.value },
                  }))
                }
                placeholder="歌词方向"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={form.brief?.referenceTracks ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, referenceTracks: e.target.value },
                  }))
                }
                placeholder="参考曲目"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
              <input
                type="url"
                value={form.brief?.referenceTrackUrl ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, referenceTrackUrl: e.target.value },
                  }))
                }
                placeholder="参考曲目链接（公网直链）"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={form.brief?.specialRequirements ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, specialRequirements: e.target.value },
                  }))
                }
                placeholder="特殊要求"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
              <textarea
                value={form.brief?.freeDescription ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brief: { ...f.brief, freeDescription: e.target.value },
                  }))
                }
                placeholder="自由描述"
                rows={2}
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                disabled={isSubmitting}
              />
            </div>
          </details>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
          <Link
            href="/dashboard/projects"
            className="rounded-xl border border-amber-300 px-6 py-2.5 font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-zinc-800"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
