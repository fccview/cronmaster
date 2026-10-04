import fs from "fs";
import path from "path";
import "server-only";
import type { AbstractIntlMessages } from "next-intl";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("i18n");

/**
 * Load translation messages for a given locale.
 * First checks for custom translations in ./data/translations/,
 * then falls back to built-in translations in app/_translations/.
 *
 * This function is server-only and should only be called from server components
 * or server actions.
 */
export const loadTranslationMessages = async (
  locale: string
): Promise<AbstractIntlMessages> => {
  const customTranslationPath = path.join(
    process.cwd(),
    "data",
    "translations",
    `${locale}.json`
  );

  try {
    if (fs.existsSync(customTranslationPath)) {
      const customMessages = JSON.parse(
        fs.readFileSync(customTranslationPath, "utf8")
      );
      log.infoOnce(`custom-${locale}`, "Using custom translations", { locale });
      return customMessages;
    }
  } catch (error) {
    log.warn(`Failed to load custom translation for ${locale}`, error);
  }

  try {
    const messages = (await import(`../../../_translations/${locale}.json`))
      .default;
    return messages;
  } catch (error) {
    log.warn(`No built-in translations for ${locale}, falling back to en`, error);
    const fallbackMessages = (await import("../../../_translations/en.json"))
      .default;
    return fallbackMessages;
  }
};

type TranslationFunction = (key: string) => string;


export const getTranslations = async (
  locale: string = process.env.LOCALE || "en"
): Promise<TranslationFunction> => {
  const messages = await loadTranslationMessages(locale);

  return (key: string) => {
    const keys = key.split(".");
    let value: AbstractIntlMessages | string | undefined = messages;
    for (const k of keys) {
      value = typeof value === "object" ? value[k] : undefined;
    }
    return (value as string | undefined) || key;
  };
};
