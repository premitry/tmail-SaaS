/** Build CSS statis (ganti Play CDN yang berat). */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.ts"],
  safelist: [
    { pattern: /(bg|text|border)-(indigo|green|red|amber|gray|purple)-(100|200|600|700)/ },
    "text-green-500", "text-red-500", "text-gray-400", "text-amber-600", "text-blue-500", "text-blue-700", "text-purple-600",
    "bg-indigo-50", "dark:bg-indigo-950/40", "border-indigo-100", "dark:border-indigo-900", "text-indigo-900", "dark:text-indigo-200",
    "bg-indigo-50/30", "dark:bg-indigo-900/10",
    "dark:bg-red-950/40", "dark:border-red-900", "dark:text-red-300", "border-red-300", "text-red-700", "bg-red-50",
  ],
  theme: { extend: {} },
  plugins: [],
};
