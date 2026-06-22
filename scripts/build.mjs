import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/index.tsx"],
  outfile: "dist/index.js",
  bundle: true,
  format: "iife",
  globalName: "RelationshipServerNotifs",
  target: "es2020",
  jsx: "transform",
  external: ["@vendetta", "@vendetta/*", "react", "react-native"],
  legalComments: "none"
});
await copyFile("manifest.json", "dist/manifest.json");
