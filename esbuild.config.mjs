import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { build } from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";
import { glob } from "glob";

async function buildAll() {
  const entryPoints = await glob("./src/functions/**/*.ts");

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
    exclude: ["!@aws-sdk/client-cognito-identity-provider"],
    external: ["aws-lambda", "!@aws-sdk/client-cognito-identity-provider"],
    tsconfig: "./tsconfig.build.json",
    plugins: [
      esbuildPluginTsc(),
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
