import type { Config } from "tailwindcss";

const config: Config = {
  // 👇 이 줄을 반드시 추가해야 dark:bg-black 같은 코드가 작동합니다!
  darkMode: "class", 
  
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;