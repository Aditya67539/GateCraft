import { defineConfig } from "vite";

export default defineConfig({
  base: "/GateCraft",
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "p5",
              test: /node_modules\/p5/,
            },
            {
              name: "vendor",
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
});