import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// 💡 1. Next.js 전용 Script 컴포넌트 불러오기
import Script from 'next/script'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LABGG.PRO',
  description: 'PROVE YOUR PHYSICAL LIMITS WITH NUMBERS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 💡 2. 여기에 구글 애드센스 스크립트 꽂아넣기 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9543272564767938"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}