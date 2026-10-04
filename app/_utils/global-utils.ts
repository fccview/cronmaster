import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("ui");

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    log.warn("Failed to copy to clipboard", err);
    return false;
  }
};
