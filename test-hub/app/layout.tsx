import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './components/providers'; // 추가

export const metadata: Metadata = {
  title: 'LABGG.PRO',
  description: 'Human Limit Test',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning은 next-themes 사용 시 필수입니다.
    <html lang="ko" suppressHydrationWarning>
      {/* 배경과 글자색이 테마에 따라 부드럽게 바뀌도록 설정 */}
      <body className="bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}