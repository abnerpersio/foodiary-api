const { build } = require("esbuild");
const { glob } = require("glob");
const { sentryEsbuildPlugin } = require("@sentry/esbuild-plugin");

async function buildAll() {
  const entryPoints = await glob("./src/functions/*.ts");

  await build({
    entryPoints,
    bundle: true,
    outdir: "dist",
    platform: "node",
    target: "node22",
    format: "cjs",
    sourcemap: true,
    minify: false,
    keepNames: true,
    outExtension: {
      ".js": ".js",
    },
    external: ["aws-lambda"],
    tsconfig: "./tsconfig.build.json",
    plugins: [
      sentryEsbuildPlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      }),
    ],
  });

  console.log("Build completed successfully!");
}

buildAll().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
