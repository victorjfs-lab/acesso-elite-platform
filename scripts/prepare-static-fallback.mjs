import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const indexPath = path.join(distDir, "index.html");
const notFoundPath = path.join(distDir, "404.html");
const okPath = path.join(distDir, "200.html");

if (!existsSync(indexPath)) {
  throw new Error("dist/index.html nao encontrado. Rode a build antes do fallback.");
}

copyFileSync(indexPath, notFoundPath);
copyFileSync(indexPath, okPath);

console.log("Fallback SPA preparado:", { notFoundPath, okPath });
