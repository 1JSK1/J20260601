/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./data/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#090A0E",
        surface: "#11131A",
        panel: "#171A22",
        elevated: "#0F1117",
        muted: "#8F9AAB",
        line: "#2C3445",
        primary: "#387FE6",
        success: "#5B9761",
        lightPrimary: "#3F70D0",
        lightSuccess: "#5D9E59",
        lightAccent: "#3F70D0",
        warning: "#F59E0B",
        danger: "#EF4444"
      }
    }
  },
  plugins: []
};
