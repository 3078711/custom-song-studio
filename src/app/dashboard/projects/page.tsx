"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  listProjects,
  deleteProject,
  getStatusLabel,
  type Project,
  type ProjectStatus,
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

const STATUS_COLORS: Record<ProjectStatus, string> = {
  pending_communication: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300",
  brief_confirming: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  creating: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  first_version_sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  revising: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  waiting_confirmation: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  waiting_payment: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  completed: "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-800/50 dark:text-emerald-100",
  closed: "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400",
};

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [search, setSearch] = useState("");
  const [urlApplied, setUrlApplied] = useState(false);

  const statusesFromUrl = useMemo(() => {
    const statuses = searchParams.get("statuses");
    const status = searchParams.get("status");
    if (statuses) return statuses.split(",").filter(Boolean) as ProjectStatus[];
    if (status) return [status as ProjectStatus];
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (urlApplied) return;
    if (statusesFromUrl && statusesFromUrl.length > 0) {
      setStatusFilter(statusesFromUrl[0]);
      setUrlApplied(true);
    }
  }, [statusesFromUrl, urlApplied]);

  const loadProjects = () => {
    setProjects(listProjects());
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filtered = projects.filter((p) => {
    const matchStatus =
      !statusFilter && !statusesFromUrl
        ? true
        : statusesFromUrl && statusesFromUrl.length > 0
          ? statusesFromUrl.includes(p.status)
          : p.status === statusFilter;
    const customer = getCustomerById(p.customerId);
    const matchSearch =
      !search ||
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      (customer?.name && customer.name.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除该项目吗？")) return;
    deleteProject(id);
    loadProjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            项目列表
          </h1>
          <p className="mt-1 text-amber-700/80 dark:text-amber-300/70">
            管理所有歌曲创作项目
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
        >
          新建项目
        </Link>
      </div>

      {/* 筛选 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="搜索项目名称、客户..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            const v = (e.target.value || "") as ProjectStatus | "";
            setStatusFilter(v);
            if (!v) router.replace("/dashboard/projects");
          }}
          className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
        >
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 项目列表 */}
      <div className="overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-amber-600 dark:text-amber-400">
            {projects.length === 0 ? (
              <>
                <p className="font-medium">暂无项目</p>
                <p className="mt-2 text-sm">点击「新建项目」添加第一个项目</p>
                <Link
                  href="/dashboard/projects/new"
                  className="mt-4 inline-block text-amber-600 underline hover:text-amber-700 dark:text-amber-400"
                >
                  新建项目
                </Link>
              </>
            ) : (
              <p>未找到匹配的项目</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-amber-200/60 dark:border-amber-800/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    项目名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    客户
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    类型
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    优先级
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    预计交付
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-amber-800 dark:text-amber-200">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const customer = getCustomerById(p.customerId);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-amber-100 transition hover:bg-amber-50/50 dark:border-amber-800/20 dark:hover:bg-amber-900/10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="font-medium text-amber-800 hover:underline dark:text-amber-200"
                        >
                          {p.projectName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90">
                        {customer?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90">
                        {p.projectType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}
                        >
                          {getStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90">
                        {p.priority}
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90">
                        {p.targetDeliveryDate
                          ? new Date(p.targetDeliveryDate).toLocaleDateString(
                              "zh-CN"
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/projects/${p.id}/workbench`}
                            className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
                          >
                            工作台
                          </Link>
                          <Link
                            href={`/dashboard/projects/${p.id}`}
                            className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                          >
                            详情
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-sm text-rose-600 hover:underline dark:text-rose-400"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
