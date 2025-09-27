import fs from "node:fs";
import path from "node:path";
import { BUILD_BASE_PATH } from "./config";

export function createFunctionAsset(fileName: string): {
  asset: string;
  handler: string;
} {
  const tempDir = path.join(
    BUILD_BASE_PATH,
    "tmp",
    fileName.replace(".js", "")
  );

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  if (fs.existsSync(path.join(tempDir, fileName))) {
    throw new Error(`There is already a function file named as ${fileName}`);
  }

  const content = fs.readFileSync(
    path.join(BUILD_BASE_PATH, fileName),
    "utf-8"
  );

  fs.writeFileSync(path.join(tempDir, fileName), content);

  return {
    asset: tempDir,
    handler: `${fileName.replace(".js", "")}.handler`,
  };
}
