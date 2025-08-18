import { promises as fs } from "fs";
import path from "path";

export interface BashSnippet {
  id: string;
  title: string;
  description: string;
  category: string;
  template: string;
  tags: string[];
  source: "builtin" | "user";
  filePath: string;
}

interface SnippetMetadata {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

function parseMetadata(content: string): SnippetMetadata {
  const metadata: SnippetMetadata = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    const match = trimmed.match(/^#\s*@(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      switch (key) {
        case "id":
          metadata.id = value.trim();
          break;
        case "title":
          metadata.title = value.trim();
          break;
        case "description":
          metadata.description = value.trim();
          break;
        case "category":
          metadata.category = value.trim();
          break;
        case "tags":
          metadata.tags = value.split(",").map((tag) => tag.trim());
          break;
      }
    }
  }

  return metadata;
}

function extractTemplate(content: string): string {
  const lines = content.split("\n");
  const templateLines: string[] = [];
  let inTemplate = false;

  for (const line of lines) {
    if (line.trim().match(/^#\s*@\w+:/)) {
      continue;
    }

    if (!inTemplate && line.trim() && !line.trim().startsWith("# @")) {
      inTemplate = true;
    }

    if (inTemplate) {
      templateLines.push(line);
    }
  }

  return templateLines.join("\n").trim();
}

async function scanSnippetDirectory(
  dirPath: string,
  source: "builtin" | "user"
): Promise<BashSnippet[]> {
  const snippets: BashSnippet[] = [];

  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      if (file.endsWith(".sh")) {
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const metadata = parseMetadata(content);
        const template = extractTemplate(content);

        if (
          metadata.id &&
          metadata.title &&
          metadata.description &&
          metadata.category
        ) {
          snippets.push({
            id: metadata.id,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            template,
            tags: metadata.tags || [],
            source,
            filePath,
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
  }

  return snippets;
}

export async function loadAllSnippets(): Promise<BashSnippet[]> {
  const builtinSnippets = await scanSnippetDirectory(
    path.join(process.cwd(), "app", "_utils", "snippets"),
    "builtin"
  );

  const userSnippets = await scanSnippetDirectory(
    path.join(process.cwd(), "snippets"),
    "user"
  );

  return [...builtinSnippets, ...userSnippets];
}

export function searchBashSnippets(
  snippets: BashSnippet[],
  query: string
): BashSnippet[] {
  const lowercaseQuery = query.toLowerCase();
  return snippets.filter(
    (snippet) =>
      snippet.title.toLowerCase().includes(lowercaseQuery) ||
      snippet.description.toLowerCase().includes(lowercaseQuery) ||
      snippet.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
      snippet.category.toLowerCase().includes(lowercaseQuery)
  );
}

export function getSnippetCategories(snippets: BashSnippet[]): string[] {
  const categories = new Set(snippets.map((snippet) => snippet.category));
  return Array.from(categories).sort();
}

export function getSnippetById(
  snippets: BashSnippet[],
  id: string
): BashSnippet | undefined {
  return snippets.find((snippet) => snippet.id === id);
}
