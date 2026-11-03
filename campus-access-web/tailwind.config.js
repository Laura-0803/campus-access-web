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
        page: "#F3F5F8",
        panel: "rgba(255,255,255,0.9)",
        textMain: "#182230",
        textSoft: "#667085",
        primary: "#4F46E5",
        primary2: "#4338CA",
        primarySoft: "#EEF2FF",
        cyanSoft: "#ECFDFD",
        success: "#15803D",
        warning: "#D97706",
        danger: "#DC2626"
      },
      borderRadius: {
        soft: "18px",
        card: "22px"
      },
      boxShadow: {
        soft: "0 20px 56px rgba(15, 23, 42, 0.09)",
        card: "0 8px 24px rgba(15, 23, 42, 0.065)",
        glow: "0 10px 24px rgba(79, 70, 229, 0.18)",
        innerSoft: "inset 0 1px 0 rgba(255,255,255,0.82)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 8% 5%, rgba(79,70,229,.08), transparent 26%), radial-gradient(circle at 92% 8%, rgba(14,165,233,.07), transparent 22%)"
      }
    }
  },
  plugins: []
};
