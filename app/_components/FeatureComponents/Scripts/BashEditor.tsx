"use client";

import { useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { Button } from "../../GlobalComponents/UIElements/Button";
import { Terminal, Copy, Check } from "lucide-react";

interface BashEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const BashEditor = ({
  value,
  onChange,
  placeholder = "#!/bin/bash\n# Your bash script here\necho 'Hello World'",
  className = "",
  label = "Bash Script",
}: BashEditorProps) => {
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const bashLanguage = javascript({
      typescript: false,
      jsx: false,
    });

    const state = EditorState.create({
      doc: value || placeholder,
      extensions: [
        bashLanguage,
        oneDark,
        EditorView.updateListener.of((update: any) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            fontSize: "14px",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            height: "100%",
            maxHeight: "100%",
          },
          ".cm-content": {
            padding: "12px",
            minHeight: "200px",
          },
          ".cm-line": {
            lineHeight: "1.4",
          },
          ".cm-scroller": {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            height: "100%",
            maxHeight: "100%",
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (editorViewRef.current) {
      const currentValue = editorViewRef.current.state.doc.toString();
      if (currentValue !== value) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: editorViewRef.current.state.doc.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  const handleCopy = async () => {
    if (editorViewRef.current) {
      const text = editorViewRef.current.state.doc.toString();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <div className="border border-border overflow-hidden h-full">
        <div ref={editorRef} className="h-full rounded-lg" />
      </div>
    </div>
  );
}
