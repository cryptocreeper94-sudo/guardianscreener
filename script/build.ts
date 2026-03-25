import { build as viteBuild } from "vite";
import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  console.log("Compiling Vite client...");
  await viteBuild({
    build: {
      outDir: path.resolve(__dirname, "../dist/public"),
      emptyOutDir: true,
    },
  });

  console.log("Bundling Express server with ESBuild...");
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "../server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: path.resolve(__dirname, "../dist/index.cjs"),
    format: "cjs",
    external: [
      "express", 
      "ws", 
      "pg", 
      "dotenv", 
      "drizzle-orm", 
      "cors", 
      "framer-motion", 
      "axios", 
      "@solana/web3.js", 
      "react", 
      "react-dom"
    ],
  });

  console.log("Build successful.");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
