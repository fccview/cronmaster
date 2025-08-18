"use server";

import { revalidatePath } from "next/cache";
import {
  loadAllSnippets,
  searchBashSnippets,
  getSnippetCategories,
  getSnippetById,
  type BashSnippet,
} from "@/app/_utils/snippetScanner";

export { type BashSnippet } from "@/app/_utils/snippetScanner";

export async function fetchSnippets(): Promise<BashSnippet[]> {
  try {
    return await loadAllSnippets();
  } catch (error) {
    console.error("Error loading snippets:", error);
    return [];
  }
}

export async function searchSnippets(query: string): Promise<BashSnippet[]> {
  try {
    const snippets = await loadAllSnippets();
    return searchBashSnippets(snippets, query);
  } catch (error) {
    console.error("Error searching snippets:", error);
    return [];
  }
}

export async function fetchSnippetCategories(): Promise<string[]> {
  try {
    const snippets = await loadAllSnippets();
    return getSnippetCategories(snippets);
  } catch (error) {
    console.error("Error loading snippet categories:", error);
    return [];
  }
}

export async function fetchSnippetById(
  id: string
): Promise<BashSnippet | undefined> {
  try {
    const snippets = await loadAllSnippets();
    return getSnippetById(snippets, id);
  } catch (error) {
    console.error("Error loading snippet by ID:", error);
    return undefined;
  }
}

export async function fetchSnippetsByCategory(
  category: string
): Promise<BashSnippet[]> {
  try {
    const snippets = await loadAllSnippets();
    return snippets.filter((snippet) => snippet.category === category);
  } catch (error) {
    console.error("Error loading snippets by category:", error);
    return [];
  }
}

export async function fetchSnippetsBySource(
  source: "builtin" | "user"
): Promise<BashSnippet[]> {
  try {
    const snippets = await loadAllSnippets();
    return snippets.filter((snippet) => snippet.source === source);
  } catch (error) {
    console.error("Error loading snippets by source:", error);
    return [];
  }
}
