"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CustomerLevel,
} from "@/lib/customers";
import { getProjectsByCustomerId } from "@/lib/projects";

const LEVEL_OPTIONS: CustomerLevel[] = ["普通", "重点", "VIP"];
const SOURCE_OPTIONS = ["闲鱼", "淘宝", "小红书", "微信", "朋友介绍", "其他"];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    wechat: "",
    sourceChannel: "",
    remark: "",
    level: "普通" as CustomerLevel,
  });

  useEffect(() => {
    const c = getCustomerById(id);
    setCustomer(c ?? null);
    if (c) {
      setForm({
        name: c.name,
        phone: c.phone ?? "",
        wechat: c.wechat ?? "",
        sourceChannel: c.sourceChannel ?? "",
        remark: c.remark ?? "",
        level: c.level,
      });
    }
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("请输入客户姓名");
      return;
    }
    if (!customer) return;
    setIsSubmitting(true);
    try {
      updateCustomer(id, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        wechat: form.wechat.trim() || undefined,
        sourceChannel: form.sourceChannel || undefined,
        remark: form.remark.trim() || undefined,
        level: form.level,
      });
      setCustomer(getCustomerById(id) ?? null);
      setIsEditing(false);
    } catch (err) {
      setError("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!confirm("确定要删除该客户吗？此操作不可恢复。")) return;
    deleteCustomer(id);
    router.push("/dashboard/customers");
  };

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/customers"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          ← 返回列表
        </Link>
        <p className="text-amber-600 dark:text-amber-400">客户不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customers"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          ← 返回列表
        </Link>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-zinc-800"
              >
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
              >
                删除
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
          {customer.name}
        </h1>
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400/80">
          创建于 {new Date(customer.createdAt).toLocaleString("zh-CN")}
        </p>
      </div>

      {isEditing ? (
        <form
          onSubmit={handleSave}
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
                客户姓名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
                手机号
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
                微信
              </label>
              <input
                type="text"
                value={form.wechat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, wechat: e.target.value }))
                }
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
                来源渠道
              </label>
              <select
                value={form.sourceChannel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceChannel: e.target.value }))
                }
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
                disabled={isSubmitting}
              >
                <option value="">请选择</option>
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100">
                客户等级
              </label>
              <div className="flex gap-4">
                {LEVEL_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="level"
                      value={opt}
                      checked={form.level === opt}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          level: opt as CustomerLevel,
                        }))
                      }
                      disabled={isSubmitting}
                      className="text-amber-500"
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
                备注
              </label>
              <textarea
                value={form.remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
                rows={3}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setForm({
                  name: customer.name,
                  phone: customer.phone ?? "",
                  wechat: customer.wechat ?? "",
                  sourceChannel: customer.sourceChannel ?? "",
                  remark: customer.remark ?? "",
                  level: customer.level,
                });
              }}
              className="rounded-xl border border-amber-300 px-6 py-2.5 font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-zinc-800"
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-800/30 dark:bg-zinc-900/80">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-amber-600 dark:text-amber-400/80">
                手机号
              </dt>
              <dd className="mt-1 text-amber-900 dark:text-amber-100">
                {customer.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-amber-600 dark:text-amber-400/80">
                微信
              </dt>
              <dd className="mt-1 text-amber-900 dark:text-amber-100">
                {customer.wechat || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-amber-600 dark:text-amber-400/80">
                来源渠道
              </dt>
              <dd className="mt-1 text-amber-900 dark:text-amber-100">
                {customer.sourceChannel || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-amber-600 dark:text-amber-400/80">
                客户等级
              </dt>
              <dd className="mt-1 text-amber-900 dark:text-amber-100">
                {customer.level}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-amber-600 dark:text-amber-400/80">
                备注
              </dt>
              <dd className="mt-1 text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                {customer.remark || "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 space-y-4">
            <Link
              href={`/dashboard/projects/new?customerId=${customer.id}`}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
            >
              为此客户新建项目
            </Link>
            {(() => {
              const customerProjects = getProjectsByCustomerId(customer.id);
              if (customerProjects.length === 0) return null;
              return (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    关联项目
                  </h3>
                  <ul className="space-y-2">
                    {customerProjects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg border border-amber-200/50 px-3 py-2 dark:border-amber-800/30">
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="font-medium text-amber-800 hover:underline dark:text-amber-200"
                        >
                          {p.projectName}
                        </Link>
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/projects/${p.id}/workbench`}
                            className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                          >
                            工作台
                          </Link>
                          <Link
                            href={`/dashboard/projects/${p.id}`}
                            className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                          >
                            详情
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
