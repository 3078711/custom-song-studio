import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 - Custom Song Studio",
  description: "登录 Custom Song Studio，创作属于你的音乐",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
