import fs from "node:fs";
import path from "node:path";
import { BUILD_BASE_PATH } from "./config";

export function createFunctionAsset(pathTofileName: string): {
  asset: string;
  handler: string;
} {
  const fileName = pathTofileName.split("/").at(-1);
  if (!fileName) throw new Error(`Invalid path to file name ${pathTofileName}`);

  const tempDir = path.join(BUILD_BASE_PATH, "tmp", fileName);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const content = fs.readFileSync(
    path.join(BUILD_BASE_PATH, pathTofileName + ".js"),
    "utf-8"
  );

  fs.writeFileSync(path.join(tempDir, fileName + ".js"), content);

  return {
    asset: tempDir,
    handler: `${fileName}.handler`,
  };
}

export const toKebabCase = (input: string) =>
  input
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
