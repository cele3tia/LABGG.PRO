export default function Footer() {
  return (
    <footer className="w-full px-6 py-4 border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-[#0a0a0a] transition-colors duration-300 mt-auto">
      <div className="flex items-center justify-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
        <a href="/proxies" className="hover:text-black dark:hover:text-white transition-colors">
          Proxies
        </a>
        <a href="/privacy" className="hover:text-black dark:hover:text-white transition-colors">
          Privacy
        </a>
      </div>
    </footer>
  );
}