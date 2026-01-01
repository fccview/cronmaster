"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import {
  MagnifyingGlassIcon,
  FileTextIcon,
  FolderOpen,
  CodeIcon,
  GearIcon,
  Database,
  CopyIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import {
  fetchSnippets,
  fetchSnippetCategories,
  searchSnippets,
  type BashSnippet,
} from "@/app/_server/actions/snippets";

interface BashSnippetHelperProps {
  onInsertSnippet: (snippet: string) => void;
}

const categoryIcons = {
  "File Operations": FileTextIcon,
  Loops: CodeIcon,
  Conditionals: CodeIcon,
  "System Operations": GearIcon,
  "Database Operations": Database,
  "UserIcon Examples": FolderOpen,
  "Custom Scripts": CodeIcon,
};

export const BashSnippetHelper = ({
  onInsertSnippet,
}: BashSnippetHelperProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<BashSnippet[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<BashSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [snippetsData, categoriesData] = await Promise.all([
          fetchSnippets(),
          fetchSnippetCategories(),
        ]);
        setSnippets(snippetsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error loading snippets:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const filterSnippets = async () => {
      if (searchQuery) {
        const searchResults = await searchSnippets(searchQuery);
        setFilteredSnippets(searchResults);
      } else if (selectedCategory) {
        const categoryResults = snippets.filter(
          (s) => s.category === selectedCategory
        );
        setFilteredSnippets(categoryResults);
      } else {
        setFilteredSnippets(snippets);
      }
    };

    filterSnippets();
  }, [searchQuery, selectedCategory, snippets]);

  const handleCopy = async (snippet: BashSnippet) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(snippet.template);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = snippet.template;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleInsert = (snippet: BashSnippet) => {
    onInsertSnippet(snippet.template);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-center py-8">
          <CodeIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading snippets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bash snippets..."
          className="pl-9"
        />
      </div>

      {!searchQuery && (
        <div className="overflow-x-auto tui-scrollbar">
          <div className="flex gap-1 pb-2 min-w-max">
            <Button
              type="button"
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-xs flex-shrink-0 h-6 px-2"
            >
              All
            </Button>
            {categories.map((category) => {
              const Icon =
                categoryIcons[category as keyof typeof categoryIcons] || CodeIcon;
              return (
                <Button
                  key={category}
                  type="button"
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs flex-shrink-0 h-6 px-2"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {category}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto !pr-0 tui-scrollbar">
        {filteredSnippets.map((snippet) => {
          const Icon =
            categoryIcons[snippet.category as keyof typeof categoryIcons] ||
            CodeIcon;
          return (
            <div
              key={snippet.id}
              className="bg-muted/30 rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {snippet.title}
                  </h4>
                  {snippet.source === "user" && (
                    <span className="inline-block px-1.5 py-0.5 text-xs text-status-success border border-border">
                      User
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {snippet.description}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {snippet.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                  {snippet.tags.length > 3 && (
                    <span className="inline-block px-2 py-1 text-xs text-muted-foreground">
                      +{snippet.tags.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(snippet)}
                  >
                    {copiedId === snippet.id ? (
                      <CheckIcon className="h-3 w-3" />
                    ) : (
                      <CopyIcon className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleInsert(snippet)}
                    className="flex-1"
                  >
                    Insert
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSnippets.length === 0 && (
          <div className="text-center py-8">
            <CodeIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `No snippets found for "${searchQuery}"`
                : "No snippets available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
