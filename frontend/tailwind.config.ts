import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // government-tech trust palette, not generic AI-chatbot purple
        setu: {
          navy: "#0B3D5C",
          teal: "#0F7A72",
          saffron: "#E8871E",
          bg: "#F7F9FA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
