"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const VALID_USERNAME =
  process.env.NEXT_PUBLIC_LOGIN_USERNAME ?? "13525069089";
const VALID_PASSWORD =
  process.env.NEXT_PUBLIC_LOGIN_PASSWORD ?? "3078711";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!username.trim()) {
      setError("请输入用户名");
      setIsLoading(false);
      return;
    }
    if (!password) {
      setError("请输入密码");
      setIsLoading(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (username.trim() === VALID_USERNAME && password === VALID_PASSWORD) {
        sessionStorage.setItem("loggedIn", "true");
        router.push("/dashboard");
      } else {
        setError("用户名或密码错误");
      }
    } catch (err) {
      setError("登录失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-4 dark:from-zinc-950 dark:via-amber-950/20 dark:to-rose-950/20">
      <div className="w-full max-w-sm">
        {/* Logo & 标题 */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-amber-800 dark:text-amber-200">
            Custom Song Studio
          </h1>
          <p className="mt-2 text-sm text-amber-700/80 dark:text-amber-300/70">
            创作属于你的音乐
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-6 shadow-lg shadow-amber-200/20 backdrop-blur-sm dark:border-amber-800/40 dark:bg-zinc-900/80 dark:shadow-amber-900/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-amber-900 dark:text-amber-100"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800/50 dark:bg-zinc-800/50 dark:text-amber-100 dark:placeholder:text-amber-600"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-medium text-white shadow-md shadow-amber-500/30 transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 dark:shadow-amber-900/30"
            >
              {isLoading ? "登录中..." : "登 录"}
            </button>
          </form>
        </div>

        {/* 返回首页 */}
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-amber-600/80 hover:text-amber-700 dark:text-amber-400/80 dark:hover:text-amber-300"
          >
            ← 返回首页
          </Link>
        </p>
      </div>
    </div>
  );
}
