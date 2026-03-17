"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCustomer, type CustomerLevel } from "@/lib/customers";

const LEVEL_OPTIONS: CustomerLevel[] = ["普通", "重点", "VIP"];
const SOURCE_OPTIONS = ["闲鱼", "淘宝", "小红书", "微信", "朋友介绍", "其他"];

export default function NewCustomerPage() {
  const router = useRouter();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("请输入客户姓名");
      return;
    }
    setIsSubmitting(true);
    try {
      const customer = createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        wechat: form.wechat.trim() || undefined,
        sourceChannel: form.sourceChannel || undefined,
        remark: form.remark.trim() || undefined,
        level: form.level,
      });
      router.push(`/dashboard/customers/${customer.id}`);
    } catch (err) {
      setError("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/customers"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          ← 返回列表
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
          新建客户
        </h1>
        <p className="mt-1 text-amber-700/80 dark:text-amber-300/70">
          填写客户基本信息
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
              客户姓名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="请输入客户姓名或昵称"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
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
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="请输入手机号"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
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
              onChange={(e) => setForm((f) => ({ ...f, wechat: e.target.value }))}
              placeholder="请输入微信号"
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
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
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100"
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
                      setForm((f) => ({ ...f, level: opt as CustomerLevel }))
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
              备注
            </label>
            <textarea
              value={form.remark}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
              placeholder="客户偏好、沟通习惯等"
              rows={3}
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
              disabled={isSubmitting}
            />
          </div>
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
            href="/dashboard/customers"
            className="rounded-xl border border-amber-300 px-6 py-2.5 font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-zinc-800"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
