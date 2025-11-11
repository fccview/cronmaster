import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

type TranslationFunction = (key: string) => string;

export const getTranslations = async (
  locale: string = process.env.LOCALE || "en"
): Promise<TranslationFunction> => {
  const messages = (await import(`../_translations/${locale}.json`)).default;

  return (key: string) => {
    const keys = key.split(".");
    let value: any = messages;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
};
