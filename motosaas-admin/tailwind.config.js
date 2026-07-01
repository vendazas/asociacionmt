/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        line: "#d4d4d4",
        brand: "#0f766e",
        accent: "#b45309"
      },
      boxShadow: {
        panel: "0 14px 34px rgba(23, 23, 23, 0.08)"
      }
    }
  },
  plugins: []
};
