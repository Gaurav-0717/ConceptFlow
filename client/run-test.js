import { build } from "vite";
import { resolve } from "path";
import { execSync } from "child_process";

async function main() {
  console.log("Bundling test suite with Vite...");
  await build({
    root: resolve("."),
    build: {
      ssr: true,
      lib: {
        entry: resolve("./test-visualization-engine.mjs"),
        formats: ["es"],
        fileName: () => "test-bundle.mjs"
      },
      outDir: "dist-test",
      emptyOutDir: true
    }
  });

  console.log("Executing bundled test suite...");
  const out = execSync("node dist-test/test-visualization-engine.js", { encoding: "utf8" });
  console.log(out);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
