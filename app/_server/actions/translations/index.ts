import fs from "fs";
import path from "path";
import "server-only";

/**
 * Load translation messages for a given locale.
 * First checks for custom translations in ./data/translations/,
 * then falls back to built-in translations in app/_translations/.
 *
 * This function is server-only and should only be called from server components
 * or server actions.
 */
export const loadTranslationMessages = async (locale: string): Promise<any> => {
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
      return customMessages;
    }
  } catch (error) {
    console.warn(`Failed to load custom translation for ${locale}:`, error);
  }

  try {
    const messages = (await import(`../../../_translations/${locale}.json`))
      .default;
    return messages;
  } catch (error) {
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
    let value: any = messages;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
};
