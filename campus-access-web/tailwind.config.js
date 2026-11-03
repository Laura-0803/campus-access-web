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
        page: "#EEF1F6",
        panel: "rgba(255,255,255,0.74)",
        textMain: "#172033",
        textSoft: "#64748B",
        primary: "#7C3AED",
        primary2: "#4F46E5",
        primarySoft: "#F3E8FF",
        cyanSoft: "#ECFEFF",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#EF4444"
      },
      borderRadius: {
        soft: "22px",
        card: "28px"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.08)",
        card: "0 18px 44px rgba(15, 23, 42, 0.065)",
        glow: "0 14px 36px rgba(124, 58, 237, 0.22)",
        innerSoft: "inset 0 1px 0 rgba(255,255,255,0.9)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 10% 10%, rgba(124,58,237,.15), transparent 28%), radial-gradient(circle at 85% 15%, rgba(14,165,233,.14), transparent 24%), radial-gradient(circle at 50% 100%, rgba(34,197,94,.10), transparent 28%)"
      }
    }
  },
  plugins: []
};
