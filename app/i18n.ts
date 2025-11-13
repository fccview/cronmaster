import { getRequestConfig } from "next-intl/server";
import { loadTranslationMessages } from "@/app/_server/actions/translations";

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locale || "en";

  try {
    const messages = await loadTranslationMessages(safeLocale);
    return {
      locale: safeLocale,
      messages,
    };
  } catch (error) {
    console.error(
      `Failed to load translations for locale: ${safeLocale}`,
      error
    );
    const fallbackMessages = await loadTranslationMessages("en");
    return {
      locale: "en",
      messages: fallbackMessages,
    };
  }
});
