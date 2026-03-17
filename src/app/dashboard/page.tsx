"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listProjects, getProjectById, type Project, type ProjectStatus } from "@/lib/projects";
import { getCustomerById } from "@/lib/customers";
import { listAllVersions } from "@/lib/songVersions";

const statusCardConfig: {
  key: string;
  label: string;
  statuses: ProjectStatus[];
  href: string;
  color: string;
}[] = [
  {
    key: "todayFollowUp",
    label: "今日待跟进",
    statuses: ["pending_communication", "brief_confirming"],
    href: "/dashboard/projects?statuses=pending_communication,brief_confirming",
    color: "amber",
  },
  {
    key: "pendingGenerate",
    label: "待生成",
    statuses: ["creating"],
    href: "/dashboard/projects?status=creating",
    color: "orange",
  },
  {
    key: "pendingFeedback",
    label: "待客户反馈",
    statuses: ["first_version_sent"],
    href: "/dashboard/projects?status=first_version_sent",
    color: "blue",
  },
  {
    key: "pendingRevise",
    label: "待修改",
    statuses: ["revising"],
    href: "/dashboard/projects?status=revising",
    color: "rose",
  },
  {
    key: "pendingDeliver",
    label: "待交付",
    statuses: ["waiting_confirmation"],
    href: "/dashboard/projects?status=waiting_confirmation",
    color: "emerald",
  },
  {
    key: "pendingPayment",
    label: "待收款",
    statuses: ["waiting_payment"],
    href: "/dashboard/projects?status=waiting_payment",
    color: "violet",
  },
];

const colorClasses: Record<string, string> = {
  amber:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200/60 dark:border-amber-700/40",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border-orange-200/60 dark:border-orange-700/40",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200/60 dark:border-blue-700/40",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-200/60 dark:border-rose-700/40",
  emerald:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-200/60 dark:border-emerald-700/40",
  violet:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 border-violet-200/60 dark:border-violet-700/40",
};

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 60) return `${diffM}分钟前`;
  if (diffH < 24) return `${diffH}小时前`;
  if (diffD === 1) return "昨天";
  if (diffD < 7) return `${diffD}天前`;
  return d.toLocaleDateString("zh-CN");
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentVersions, setRecentVersions] = useState<
    Awaited<ReturnType<typeof listAllVersions>>
  >([]);
  const [stats, setStats] = useState({
    todayFollowUp: 0,
    pendingGenerate: 0,
    pendingFeedback: 0,
    pendingRevise: 0,
    pendingDeliver: 0,
    pendingPayment: 0,
    monthProjects: 0,
    monthCompleted: 0,
    avgDeliveryDays: 0,
    topStyles: [] as string[],
  });

  const loadData = () => {
    const list = listProjects();
    setProjects(list);

    const versions = listAllVersions(5);
    setRecentVersions(versions);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthProjects = list.filter(
      (p) => new Date(p.createdAt) >= thisMonthStart
    ).length;
    const monthCompleted = list.filter(
      (p) =>
        p.status === "completed" &&
        new Date(p.updatedAt) >= thisMonthStart
    ).length;

    const completedWithDate = list.filter(
      (p) =>
        p.status === "completed" &&
        p.createdAt &&
        p.targetDeliveryDate
    );
    let avgDeliveryDays = 0;
    if (completedWithDate.length > 0) {
      const total = completedWithDate.reduce((sum, p) => {
        const created = new Date(p.createdAt).getTime();
        const target = new Date(p.targetDeliveryDate!).getTime();
        return sum + (target - created) / 86400000;
      }, 0);
      avgDeliveryDays = Math.round(total / completedWithDate.length);
    }

    const styleCount: Record<string, number> = {};
    versions.forEach((v) => {
      const s = v.style?.trim() || "其他";
      styleCount[s] = (styleCount[s] || 0) + 1;
    });
    const topStyles = Object.entries(styleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s);

    const todayFollowUp = list.filter((p) =>
      ["pending_communication", "brief_confirming"].includes(p.status)
    ).length;
    const pendingGenerate = list.filter((p) => p.status === "creating").length;
    const pendingFeedback = list.filter(
      (p) => p.status === "first_version_sent"
    ).length;
    const pendingRevise = list.filter((p) => p.status === "revising").length;
    const pendingDeliver = list.filter(
      (p) => p.status === "waiting_confirmation"
    ).length;
    const pendingPayment = list.filter(
      (p) => p.status === "waiting_payment"
    ).length;

    setStats({
      todayFollowUp,
      pendingGenerate,
      pendingFeedback,
      pendingRevise,
      pendingDeliver,
      pendingPayment,
      monthProjects,
      monthCompleted,
      avgDeliveryDays: avgDeliveryDays || 0,
      topStyles: topStyles.length > 0 ? topStyles : ["暂无"],
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenWorkbench = () => {
    if (projects.length === 0) {
      router.push("/dashboard/projects/new");
      return;
    }
    const mostRecent = projects[0];
    router.push(`/dashboard/projects/${mostRecent.id}/workbench`);
  };

  return (
    <div className="space-y-8">
      {/* 欢迎区 */}
      <div>
        <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
          工作台
        </h1>
        <p className="mt-1 text-amber-700/80 dark:text-amber-300/70">
          今日概览与快捷入口
        </p>
      </div>

      {/* 快捷入口 */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/customers/new"
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
        >
          新建客户
        </Link>
        <Link
          href="/dashboard/projects/new"
          className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:bg-zinc-800/50 dark:text-amber-200 dark:hover:bg-zinc-800"
        >
          新建项目
        </Link>
        <button
          onClick={handleOpenWorkbench}
          className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:bg-zinc-800/50 dark:text-amber-200 dark:hover:bg-zinc-800"
        >
          歌曲生成工作台
        </button>
      </div>

      {/* 项目状态卡片 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-amber-900 dark:text-amber-100">
          项目状态
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statusCardConfig.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className={`rounded-xl border p-4 transition hover:shadow-md ${colorClasses[card.color]}`}
            >
              <div className="text-2xl font-bold">
                {stats[card.key as keyof typeof stats] ?? 0}
              </div>
              <div className="mt-1 text-sm opacity-90">{card.label}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 关键指标 + 最近版本 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 关键指标 */}
        <div className="rounded-xl border border-amber-200/60 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
          <h2 className="mb-4 text-lg font-semibold text-amber-900 dark:text-amber-100">
            本月关键指标
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-amber-700 dark:text-amber-300/80">
                本月项目数
              </dt>
              <dd className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.monthProjects}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-amber-700 dark:text-amber-300/80">
                成交项目数
              </dt>
              <dd className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.monthCompleted}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-amber-700 dark:text-amber-300/80">
                平均交付周期
              </dt>
              <dd className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.avgDeliveryDays} 天
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-amber-700 dark:text-amber-300/80">
                热门风格
              </dt>
              <dd className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.topStyles.join("、")}
              </dd>
            </div>
          </dl>
        </div>

        {/* 最近创建版本 */}
        <div className="rounded-xl border border-amber-200/60 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
          <h2 className="mb-4 text-lg font-semibold text-amber-900 dark:text-amber-100">
            最近创建版本
          </h2>
          {recentVersions.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              暂无版本，生成后将显示在此
            </p>
          ) : (
            <ul className="space-y-3">
              {recentVersions.map((v) => {
                const project = getProjectById(v.projectId);
                const customer = project
                  ? getCustomerById(project.customerId)
                  : null;
                return (
                  <li key={v.id}>
                    <Link
                      href={`/dashboard/projects/${v.projectId}/workbench`}
                      className="block rounded-lg border border-amber-200/50 px-4 py-3 transition hover:bg-amber-50/80 dark:border-amber-800/30 dark:hover:bg-amber-900/20"
                    >
                      <div className="font-medium text-amber-900 dark:text-amber-100">
                        {v.title || "未命名"} - {v.versionNo}
                      </div>
                      <div className="mt-0.5 text-sm text-amber-600 dark:text-amber-400/80">
                        {project?.projectName ?? "—"} · {formatTimeAgo(v.createdAt)}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/dashboard/projects"
            className="mt-4 block text-center text-sm text-amber-600 hover:underline dark:text-amber-400"
          >
            查看全部 →
          </Link>
        </div>
      </div>
    </div>
  );
}
