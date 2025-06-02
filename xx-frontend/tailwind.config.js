// xx-frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // 扫描 src 目录下所有 js, jsx, ts, tsx 文件
    "./public/index.html"        // 扫描 public 目录下的 index.html (如果需要)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}