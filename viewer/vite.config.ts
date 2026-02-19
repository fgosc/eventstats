import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const gitRevision = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  plugins: [react()],
  base: "/eventstats/",
  define: {
    __GIT_REVISION__: JSON.stringify(gitRevision),
  },
});
