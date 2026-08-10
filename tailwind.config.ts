import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Привязка к теме Telegram (переменные приходят из WebApp)
        tg: {
          bg: "var(--tg-bg, #17212b)",
          card: "var(--tg-card, #232e3c)",
          text: "var(--tg-text, #ffffff)",
          hint: "var(--tg-hint, #7d8b99)",
          accent: "var(--tg-accent, #5ea3f0)",
          border: "var(--tg-border, #2a3947)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
