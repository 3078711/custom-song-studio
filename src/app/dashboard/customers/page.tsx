"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  listCustomers,
  deleteCustomer,
  type Customer,
  type CustomerLevel,
} from "@/lib/customers";

const LEVEL_LABELS: Record<CustomerLevel, string> = {
  普通: "普通",
  重点: "重点",
  VIP: "VIP",
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCustomers = () => {
    setCustomers(listCustomers());
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.wechat && c.wechat.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除该客户吗？")) return;
    setDeletingId(id);
    deleteCustomer(id);
    loadCustomers();
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            客户列表
          </h1>
          <p className="mt-1 text-amber-700/80 dark:text-amber-300/70">
            管理所有客户信息
          </p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
        >
          新建客户
        </Link>
      </div>

      {/* 搜索 */}
      <div className="flex gap-4">
        <input
          type="search"
          placeholder="搜索客户姓名、手机号、微信..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
        />
      </div>

      {/* 客户列表 */}
      <div className="overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-amber-600 dark:text-amber-400">
            {customers.length === 0 ? (
              <>
                <p className="font-medium">暂无客户</p>
                <p className="mt-2 text-sm">点击「新建客户」添加第一个客户</p>
                <Link
                  href="/dashboard/customers/new"
                  className="mt-4 inline-block text-amber-600 underline hover:text-amber-700 dark:text-amber-400"
                >
                  新建客户
                </Link>
              </>
            ) : (
              <p>未找到匹配的客户</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-amber-200/60 dark:border-amber-800/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    客户姓名
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    联系方式
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    来源渠道
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    客户等级
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-amber-800 dark:text-amber-200">
                    备注
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-amber-800 dark:text-amber-200">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-amber-100 transition hover:bg-amber-50/50 dark:border-amber-800/20 dark:hover:bg-amber-900/10"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-medium text-amber-800 hover:underline dark:text-amber-200"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90">
                      <div className="space-y-0.5">
                        {c.phone && <div>📱 {c.phone}</div>}
                        {c.wechat && <div>💬 {c.wechat}</div>}
                        {!c.phone && !c.wechat && (
                          <span className="text-amber-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300/90">
                      {c.sourceChannel || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.level === "VIP"
                            ? "bg-amber-200/80 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200"
                            : c.level === "重点"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300"
                        }`}
                      >
                        {LEVEL_LABELS[c.level]}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-sm text-amber-600 dark:text-amber-400/80">
                      {c.remark || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/customers/${c.id}`}
                          className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                        >
                          详情
                        </Link>
                        <Link
                          href={`/dashboard/projects/new?customerId=${c.id}`}
                          className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                        >
                          新建项目
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-sm text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
