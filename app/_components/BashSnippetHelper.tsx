"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import {
  Search,
  FileText,
  FolderOpen,
  Code,
  Settings,
  Database,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import {
  bashSnippets,
  bashSnippetCategories,
  searchBashSnippets,
  type BashSnippet,
} from "../_utils/bashSnippets";

interface BashSnippetHelperProps {
  onInsertSnippet: (snippet: string) => void;
}

const categoryIcons = {
  "File Operations": FileText,
  Loops: Code,
  Conditionals: Code,
  "System Operations": Settings,
  "Database Operations": Database,
};

export function BashSnippetHelper({ onInsertSnippet }: BashSnippetHelperProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredSnippets = searchQuery
    ? searchBashSnippets(searchQuery)
    : selectedCategory
    ? bashSnippets.filter((s) => s.category === selectedCategory)
    : bashSnippets;

  const handleCopy = async (snippet: BashSnippet) => {
    await navigator.clipboard.writeText(snippet.template);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (snippet: BashSnippet) => {
    onInsertSnippet(snippet.template);
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bash snippets..."
          className="pl-9"
        />
      </div>

      {/* Category Filter */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-xs"
          >
            All
          </Button>
          {bashSnippetCategories.map((category) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            return (
              <Button
                key={category}
                type="button"
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {category}
              </Button>
            );
          })}
        </div>
      )}

      {/* Snippets List */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {filteredSnippets.map((snippet) => {
          const Icon =
            categoryIcons[snippet.category as keyof typeof categoryIcons];
          return (
            <div
              key={snippet.id}
              className="bg-muted/30 rounded-lg border border-border/50 p-3 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {snippet.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {snippet.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {snippet.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded border border-primary/20"
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
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(snippet)}
                    className="h-7 px-2"
                  >
                    {copiedId === snippet.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleInsert(snippet)}
                    className="h-7 px-2"
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
            <Code className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
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
}
