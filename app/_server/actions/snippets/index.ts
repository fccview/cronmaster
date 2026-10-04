"use server";

import {
  loadAllSnippets,
  searchBashSnippets,
  getSnippetCategories,
  type BashSnippet,
} from "@/app/_utils/snippets-utils";
import { requireActionAuth } from "@/app/_utils/server-action-auth";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("snippets");

export { type BashSnippet } from "@/app/_utils/snippets-utils";

export const fetchSnippets = async (): Promise<BashSnippet[]> => {
  await requireActionAuth();
  try {
    return await loadAllSnippets();
  } catch (error) {
    log.error("Error loading snippets", error);
    return [];
  }
}

export const searchSnippets = async (query: string): Promise<BashSnippet[]> => {
  await requireActionAuth();
  try {
    const snippets = await loadAllSnippets();
    return searchBashSnippets(snippets, query);
  } catch (error) {
    log.error("Error searching snippets", error);
    return [];
  }
}

export const fetchSnippetCategories = async (): Promise<string[]> => {
  await requireActionAuth();
  try {
    const snippets = await loadAllSnippets();
    return getSnippetCategories(snippets);
  } catch (error) {
    log.error("Error loading snippet categories", error);
    return [];
  }
}
