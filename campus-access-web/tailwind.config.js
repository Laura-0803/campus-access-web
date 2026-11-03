/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "PingFang SC",
          "Microsoft YaHei",
          "Noto Sans SC",
          "system-ui",
          "sans-serif"
        ]
      },
      colors: {
        page: "#F4F6F9",
        panel: "#FFFFFF",
        textMain: "#172033",
        textSoft: "#667085",
        primary: "#2563EB",
        primary2: "#1D4ED8",
        primarySoft: "#EFF6FF",
        cyanSoft: "#ECFEFF",
        success: "#15803D",
        warning: "#D97706",
        danger: "#DC2626"
      },
      borderRadius: {
        soft: "14px",
        card: "16px"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.08)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.04)",
        glow: "0 8px 20px rgba(37, 99, 235, 0.18)",
        innerSoft: "inset 0 1px 0 rgba(255,255,255,0.75)"
      },
      backgroundImage: {
        aurora:
          "linear-gradient(180deg, #F8FAFC 0%, #F4F6F9 100%)"
      }
    }
  },
  plugins: []
};
