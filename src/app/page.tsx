"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn === "true") {
      router.replace("/dashboard");
    }
  }, [mounted, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-zinc-950 dark:via-amber-950/20 dark:to-rose-950/20">
        <div className="text-amber-600 dark:text-amber-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-4 dark:from-zinc-950 dark:via-amber-950/20 dark:to-rose-950/20">
      <main className="flex flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-amber-800 dark:text-amber-200">
            Custom Song Studio
          </h1>
          <p className="mt-2 text-amber-700/80 dark:text-amber-300/70">
            创作属于你的音乐
          </p>
        </div>
        <Link
          href="/login"
          className="flex h-12 min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 font-medium text-white shadow-md shadow-amber-500/30 transition hover:from-amber-600 hover:to-orange-600"
        >
          登 录
        </Link>
      </main>
    </div>
  );
}
