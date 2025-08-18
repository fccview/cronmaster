"use client";

import { useState, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "./ui/Button";
import { Terminal, Copy, Check } from "lucide-react";

interface BashEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function BashEditor({
  value,
  onChange,
  placeholder = "#!/bin/bash\n# Your bash script here\necho 'Hello World'",
  className = "",
  label = "Bash Script",
}: BashEditorProps) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;

      const syntaxElement = textareaRef.current
        .nextElementSibling as HTMLElement;
      if (syntaxElement) {
        syntaxElement.scrollTop = scrollTop;
        syntaxElement.scrollLeft = scrollLeft;
      }
    }
  };

  const SyntaxHighlighterComponent = SyntaxHighlighter as any;

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-500" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="btn-outline h-7 px-2"
          >
            {copied ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <Copy className="h-3 w-3 mr-1" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          className="w-full h-32 p-3 border border-border rounded bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 relative z-10"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            lineHeight: "1.4",
            color: "transparent",
            caretColor: "hsl(var(--foreground))",
            background: "transparent",
          }}
        />
        <div
          className="absolute inset-0 p-3 pointer-events-none overflow-auto"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: "0.875rem",
            lineHeight: "1.4",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <SyntaxHighlighterComponent
            language="bash"
            style={tomorrow}
            customStyle={{
              margin: 0,
              padding: 0,
              background: "transparent",
              fontSize: "0.875rem",
              lineHeight: "1.4",
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              textShadow: "none",
            }}
            codeTagProps={{
              style: {
                textShadow: "none",
                background: "transparent",
              },
            }}
          >
            {value || placeholder}
          </SyntaxHighlighterComponent>
        </div>
      </div>
    </div>
  );
}
