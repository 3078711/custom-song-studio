"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "工作台" },
  { href: "/dashboard/customers", label: "客户中心" },
  { href: "/dashboard/projects", label: "项目中心" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const loggedIn = sessionStorage.getItem("loggedIn");
    if (loggedIn !== "true") {
      router.replace("/login");
    }
  }, [mounted, router]);

  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    router.replace("/login");
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50 dark:bg-zinc-950">
        <div className="text-amber-600 dark:text-amber-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-amber-50/80 dark:bg-zinc-950">
      {/* 侧边栏 */}
      <aside className="flex w-56 flex-col border-r border-amber-200/60 bg-white/90 dark:border-amber-800/30 dark:bg-zinc-900/90">
        <div className="border-b border-amber-200/60 px-4 py-5 dark:border-amber-800/30">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-amber-800 dark:text-amber-200"
          >
            Custom Song Studio
          </Link>
          <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
            定制歌曲创作工作台
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    : "text-amber-700 hover:bg-amber-50 dark:text-amber-300/90 dark:hover:bg-amber-900/30"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-amber-200/60 p-3 dark:border-amber-800/30">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            退出登录
          </button>
        </div>
      </aside>
      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
