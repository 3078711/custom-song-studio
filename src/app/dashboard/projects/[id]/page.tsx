"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getProjectById,
  updateProject,
  deleteProject,
  getStatusLabel,
  type Project,
  type ProjectStatus,
  type ProjectBrief,
} from "@/lib/projects";
import { getCustomerById } from "@/lib/customers";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "pending_communication", label: "待沟通" },
  { value: "brief_confirming", label: "需求确认中" },
  { value: "creating", label: "创作中" },
  { value: "first_version_sent", label: "已发初版" },
  { value: "revising", label: "修改中" },
  { value: "waiting_confirmation", label: "待确认" },
  { value: "waiting_payment", label: "待付款" },
  { value: "completed", label: "已完成" },
  { value: "closed", label: "已关闭" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState<ProjectStatus | "">("");
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefForm, setBriefForm] = useState<ProjectBrief>({});

  useEffect(() => {
    const p = getProjectById(id);
    setProject(p ?? null);
    if (p) {
      setStatusValue(p.status);
      setBriefForm(p.brief ?? {});
    }
  }, [id]);

  const handleStatusChange = () => {
    if (!project || !statusValue) return;
    updateProject(id, { status: statusValue });
    setProject(getProjectById(id) ?? null);
    setIsEditingStatus(false);
  };

  const handleBriefSave = () => {
    updateProject(id, { brief: briefForm });
    setProject(getProjectById(id) ?? null);
    setIsEditingBrief(false);
  };

  const handleDelete = () => {
    if (!confirm("确定要删除该项目吗？此操作不可恢复。")) return;
    deleteProject(id);
    router.push("/dashboard/projects");
  };

  if (!project) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/projects"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          ← 返回列表
        </Link>
        <p className="text-amber-600 dark:text-amber-400">项目不存在</p>
      </div>
    );
  }

  const customer = getCustomerById(project.customerId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/projects"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          ← 返回项目中心
        </Link>
        <button
          onClick={handleDelete}
          className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
        >
          删除项目
        </button>
      </div>

      {/* 项目概览 */}
      <div className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {project.projectName}
            </h1>
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400/80">
              创建于 {new Date(project.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditingStatus ? (
              <>
                <select
                  value={statusValue}
                  onChange={(e) =>
                    setStatusValue(e.target.value as ProjectStatus)
                  }
                  className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleStatusChange}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditingStatus(false);
                    setStatusValue(project.status);
                  }}
                  className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingStatus(true)}
                className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
              >
                {getStatusLabel(project.status)} ▼
              </button>
            )}
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              关联客户
            </dt>
            <dd className="mt-1">
              {customer ? (
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="font-medium text-amber-800 hover:underline dark:text-amber-200"
                >
                  {customer.name}
                </Link>
              ) : (
                <span className="text-amber-500">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              项目类型
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100">
              {project.projectType}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              优先级
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100">
              {project.priority}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              使用场景
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100">
              {project.scenario || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              包含视频
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100">
              {project.includeVideo ? "是" : "否"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              预算
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100">
              {project.budget || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              预计交付时间
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100">
              {project.targetDeliveryDate
                ? new Date(project.targetDeliveryDate).toLocaleDateString(
                    "zh-CN"
                  )
                : "—"}
            </dd>
          </div>
        </dl>
        {project.summary && (
          <div className="mt-4">
            <dt className="text-sm text-amber-600 dark:text-amber-400/80">
              项目摘要
            </dt>
            <dd className="mt-1 text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
              {project.summary}
            </dd>
          </div>
        )}
      </div>

      {/* 需求 Brief */}
      <div className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            需求 Brief
          </h2>
          {!isEditingBrief ? (
            <button
              onClick={() => setIsEditingBrief(true)}
              className="text-sm text-amber-600 hover:underline dark:text-amber-400"
            >
              编辑
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleBriefSave}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setBriefForm(project.brief ?? {});
                  setIsEditingBrief(false);
                }}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200"
              >
                取消
              </button>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400/80">
          收集用户需求，可与工作台参数一键带入
        </p>
        {isEditingBrief ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                风格偏好
              </label>
              <input
                type="text"
                value={briefForm.stylePreference ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    stylePreference: e.target.value || undefined,
                  }))
                }
                placeholder="如：流行、中国风、民谣"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                情绪/场景
              </label>
              <input
                type="text"
                value={briefForm.moodScene ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    moodScene: e.target.value || undefined,
                  }))
                }
                placeholder="如：温馨、浪漫表白、生日祝福"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                歌词方向
              </label>
              <input
                type="text"
                value={briefForm.lyricDirection ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    lyricDirection: e.target.value || undefined,
                  }))
                }
                placeholder="如：表达感恩、回忆青春"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                参考曲目
              </label>
              <input
                type="text"
                value={briefForm.referenceTracks ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    referenceTracks: e.target.value || undefined,
                  }))
                }
                placeholder="如：《某某歌》的风格"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                参考曲目链接（可选）
              </label>
              <input
                type="url"
                value={briefForm.referenceTrackUrl ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    referenceTrackUrl: e.target.value || undefined,
                  }))
                }
                placeholder="https://example.com/audio.mp3"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400/80">
                公网音频直链，工作台「从 Brief 带入」时将自动使用
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                特殊要求
              </label>
              <input
                type="text"
                value={briefForm.specialRequirements ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    specialRequirements: e.target.value || undefined,
                  }))
                }
                placeholder="如：需要男女对唱、时长约3分钟"
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-amber-800 dark:text-amber-200">
                自由描述
              </label>
              <textarea
                value={briefForm.freeDescription ?? ""}
                onChange={(e) =>
                  setBriefForm((b) => ({
                    ...b,
                    freeDescription: e.target.value || undefined,
                  }))
                }
                placeholder="其他需求、背景故事等..."
                rows={3}
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-800/50 dark:bg-zinc-800 dark:text-amber-100"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {project.brief &&
            Object.values(project.brief).some((v) => v?.trim()) ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {project.brief.stylePreference && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      风格偏好
                    </dt>
                    <dd className="text-sm text-amber-900 dark:text-amber-100">
                      {project.brief.stylePreference}
                    </dd>
                  </div>
                )}
                {project.brief.moodScene && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      情绪/场景
                    </dt>
                    <dd className="text-sm text-amber-900 dark:text-amber-100">
                      {project.brief.moodScene}
                    </dd>
                  </div>
                )}
                {project.brief.lyricDirection && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      歌词方向
                    </dt>
                    <dd className="text-sm text-amber-900 dark:text-amber-100">
                      {project.brief.lyricDirection}
                    </dd>
                  </div>
                )}
                {project.brief.referenceTracks && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      参考曲目
                    </dt>
                    <dd className="text-sm text-amber-900 dark:text-amber-100">
                      {project.brief.referenceTracks}
                    </dd>
                  </div>
                )}
                {project.brief.referenceTrackUrl && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      参考曲目链接
                    </dt>
                    <dd className="text-sm text-amber-900 dark:text-amber-100 break-all">
                      <a href={project.brief.referenceTrackUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline dark:text-amber-400">
                        {project.brief.referenceTrackUrl}
                      </a>
                    </dd>
                  </div>
                )}
                {project.brief.specialRequirements && (
                  <div>
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      特殊要求
                    </dt>
                    <dd className="text-sm text-amber-900 dark:text-amber-100">
                      {project.brief.specialRequirements}
                    </dd>
                  </div>
                )}
                {project.brief.freeDescription && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-amber-600 dark:text-amber-400/80">
                      自由描述
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-100">
                      {project.brief.freeDescription}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-amber-500">
                暂无需求 Brief，点击「编辑」填写
              </p>
            )}
          </div>
        )}
      </div>

      {/* 子模块入口 */}
      <div className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
          项目功能
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/projects/${project.id}/workbench`}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            歌曲生成工作台 →
          </Link>
          <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            沟通记录
          </span>
          <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            版本管理
          </span>
        </div>
      </div>
    </div>
  );
}
