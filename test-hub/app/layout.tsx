import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ❌ 이 4번째 줄을 통째로 지워줘!
// import NeonCursorEffect from "./components/NeonCursorEffect"; 

const geistSans = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}