"use server";

import {
  loadAllSnippets,
  searchBashSnippets,
  getSnippetCategories,
  getSnippetById,
  type BashSnippet,
} from "@/app/_utils/snippets-utils";

export { type BashSnippet } from "@/app/_utils/snippets-utils";

export const fetchSnippets = async (): Promise<BashSnippet[]> => {
  try {
    return await loadAllSnippets();
  } catch (error) {
    console.error("Error loading snippets:", error);
    return [];
  }
}

export const searchSnippets = async (query: string): Promise<BashSnippet[]> => {
  try {
    const snippets = await loadAllSnippets();
    return searchBashSnippets(snippets, query);
  } catch (error) {
    console.error("Error searching snippets:", error);
    return [];
  }
}

export const fetchSnippetCategories = async (): Promise<string[]> => {
  try {
    const snippets = await loadAllSnippets();
    return getSnippetCategories(snippets);
  } catch (error) {
    console.error("Error loading snippet categories:", error);
    return [];
  }
}

export const fetchSnippetById = async (
  id: string
): Promise<BashSnippet | undefined> => {
  try {
    const snippets = await loadAllSnippets();
    return getSnippetById(snippets, id);
  } catch (error) {
    console.error("Error loading snippet by ID:", error);
    return undefined;
  }
}

export const fetchSnippetsByCategory = async (
  category: string
): Promise<BashSnippet[]> => {
  try {
    const snippets = await loadAllSnippets();
    return snippets.filter((snippet) => snippet.category === category);
  } catch (error) {
    console.error("Error loading snippets by category:", error);
    return [];
  }
}

export const fetchSnippetsBySource = async (
  source: "builtin" | "user"
): Promise<BashSnippet[]> => {
  try {
    const snippets = await loadAllSnippets();
    return snippets.filter((snippet) => snippet.source === source);
  } catch (error) {
    console.error("Error loading snippets by source:", error);
    return [];
  }
}
