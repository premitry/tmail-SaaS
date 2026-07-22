/** Build CSS statis (ganti Play CDN yang berat). */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.ts"],
  safelist: [
    { pattern: /(bg|text|border)-(indigo|green|red|amber|gray|purple)-(100|200|600|700)/ },
    "text-green-500", "text-red-500", "text-gray-400", "text-amber-600", "text-blue-500", "text-blue-700", "text-purple-600",
  ],
  theme: { extend: {} },
  plugins: [],
};
