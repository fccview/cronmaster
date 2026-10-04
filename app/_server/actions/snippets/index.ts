"use server";

import {
  loadAllSnippets,
  searchBashSnippets,
  getSnippetCategories,
  getSnippetById,
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

export const fetchSnippetById = async (
  id: string
): Promise<BashSnippet | undefined> => {
  await requireActionAuth();
  try {
    const snippets = await loadAllSnippets();
    return getSnippetById(snippets, id);
  } catch (error) {
    log.error("Error loading snippet by ID", error);
    return undefined;
  }
}

export const fetchSnippetsByCategory = async (
  category: string
): Promise<BashSnippet[]> => {
  await requireActionAuth();
  try {
    const snippets = await loadAllSnippets();
    return snippets.filter((snippet) => snippet.category === category);
  } catch (error) {
    log.error("Error loading snippets by category", error);
    return [];
  }
}

export const fetchSnippetsBySource = async (
  source: "builtin" | "user"
): Promise<BashSnippet[]> => {
  await requireActionAuth();
  try {
    const snippets = await loadAllSnippets();
    return snippets.filter((snippet) => snippet.source === source);
  } catch (error) {
    log.error("Error loading snippets by source", error);
    return [];
  }
}
