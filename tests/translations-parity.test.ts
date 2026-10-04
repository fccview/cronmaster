import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { cronPatterns } from "@/app/_utils/parser-utils";

type Messages = { [key: string]: string | Messages };

const TRANSLATIONS_DIR = path.resolve(__dirname, "..", "app", "_translations");

const loadLocale = (file: string): Messages =>
  JSON.parse(readFileSync(path.join(TRANSLATIONS_DIR, file), "utf8"));

const flatten = (messages: Messages, prefix = ""): Record<string, string> =>
  Object.entries(messages).reduce<Record<string, string>>(
    (acc, [key, value]) =>
      typeof value === "string"
        ? { ...acc, [`${prefix}${key}`]: value }
        : { ...acc, ...flatten(value, `${prefix}${key}.`) },
    {}
  );

const argumentNames = (message: string) =>
  [...new Set([...message.matchAll(/\{\s*([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort();

const localeFiles = readdirSync(TRANSLATIONS_DIR).filter((file) =>
  file.endsWith(".json")
);
const en = flatten(loadLocale("en.json"));
const enKeys = Object.keys(en).sort();
const otherLocales = localeFiles
  .filter((file) => file !== "en.json")
  .map((file) => ({
    locale: file.replace(/\.json$/, ""),
    raw: loadLocale(file),
    messages: flatten(loadLocale(file)),
  }));

describe("translation files", () => {
  it("ships more than just english", () => {
    expect(otherLocales.length).toBeGreaterThan(0);
  });

  it.each(otherLocales)("$locale has exactly the same keys as en", ({ messages }) => {
    const keys = Object.keys(messages).sort();
    expect(enKeys.filter((key) => !(key in messages))).toEqual([]);
    expect(keys.filter((key) => !(key in en))).toEqual([]);
  });

  it.each(otherLocales)("$locale uses the same placeholders as en", ({ messages }) => {
    const mismatched = enKeys.filter(
      (key) =>
        key in messages &&
        argumentNames(messages[key]).join(",") !== argumentNames(en[key]).join(",")
    );
    expect(mismatched).toEqual([]);
  });

  it.each(otherLocales)("$locale has no empty messages", ({ messages }) => {
    expect(Object.keys(messages).filter((key) => !messages[key].trim())).toEqual([]);
  });

  it.each(otherLocales)("$locale keeps the Cr*nMaster name untranslated", ({ messages }) => {
    const missingName = enKeys.filter(
      (key) => en[key].includes("Cr*nMaster") && !messages[key]?.includes("Cr*nMaster")
    );
    expect(missingName).toEqual([]);
  });

  it.each([{ locale: "en", raw: loadLocale("en.json"), messages: en }, ...otherLocales])(
    "$locale messages all format without ICU errors",
    ({ locale, raw, messages }) => {
      const errors: string[] = [];
      const t = createTranslator({
        locale,
        messages: raw,
        onError: (error) => errors.push(error.message),
      });
      for (const key of Object.keys(messages)) {
        const values = Object.fromEntries(
          argumentNames(messages[key]).map((name) => [name, 2])
        );
        (t as (key: string, values?: Record<string, number>) => string)(key, values);
      }
      expect(errors).toEqual([]);
    }
  );

  it("has a translation for every quick cron pattern", () => {
    const missing = cronPatterns.flatMap((category) => [
      ...(`cronPatterns.categories.${category.id}` in en
        ? []
        : [`cronPatterns.categories.${category.id}`]),
      ...category.patterns
        .map((pattern) => `cronPatterns.${pattern.id}`)
        .filter((key) => !(key in en)),
    ]);
    expect(missing).toEqual([]);
  });
});
