"use server";

import { join } from "path";
import { SCRIPTS_DIR } from "@/app/_consts/file";

export const getScriptPath = (filename: string): string => {
  return join(process.cwd(), SCRIPTS_DIR, filename);
};

export const getHostScriptPath = (filename: string): string => {
  return `bash ${join(process.cwd(), SCRIPTS_DIR, filename)}`;
};

export const normalizeLineEndings = (content: string): string => {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};
