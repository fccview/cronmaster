import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
    return twMerge(clsx(inputs))
}

export async function getTranslations(locale: string = process.env.LOCALE || "en") {
    const messages = (await import(`../_translations/${locale}.json`)).default;

    return (key: string) => {
        const keys = key.split('.');
        let value: any = messages;
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };
}
