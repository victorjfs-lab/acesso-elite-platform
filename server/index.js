import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const port = Number(process.env.PORT || 3000);

const app = express();

app.disable("x-powered-by");
app.use(express.static(distDir, { extensions: ["html"] }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Course platform running on port ${port}`);
});
