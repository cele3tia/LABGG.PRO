import "./globals.css";
import { Providers } from "./components/providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      {/* 🚀 body 기본 글자색을 dark:text-gray-200 으로 지정 */}
      <body className="bg-white dark:bg-[#0a0a0a] text-black dark:text-gray-200 antialiased transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}