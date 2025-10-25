import type { HttpMetadata } from "@/shared/types/http";
import fs from "node:fs";
import path from "node:path";
import { BUILD_BASE_PATH } from "./config";

export function createFunctionAsset(pathTofileName: string): {
  asset: string;
  handler: string;
} {
  const fileName = pathTofileName.split("/").at(-1);
  if (!fileName) throw new Error(`Invalid path to file name ${pathTofileName}`);

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
    path.join(BUILD_BASE_PATH, pathTofileName),
    "utf-8"
  );

  fs.writeFileSync(path.join(tempDir, fileName), content);

  return {
    asset: tempDir,
    handler: `${fileName.replace(".js", "")}.handler`,
  };
}

const getExportRegex = (exportName: string) =>
  new RegExp(`(?:const|var)\\s+${exportName}\\s*=\\s*["']([^"']+)["']`);

export function getRouteMetadata(filePath: string) {
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const method = fileContent.match(getExportRegex("METHOD"))?.[1];
  const route = fileContent.match(getExportRegex("ROUTE"))?.[1];

  if (!method || !route) {
    return null;
  }

  return { method, route } as HttpMetadata;
}
