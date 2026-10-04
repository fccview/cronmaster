"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { EditorView, keymap, type ViewUpdate } from "@codemirror/view";
import { EditorState, Transaction } from "@codemirror/state";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { StreamLanguage } from "@codemirror/language";
import { useTheme } from 'next-themes';
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { TerminalIcon, CopyIcon, CheckIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

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
  label,
}: BashEditorProps) => {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const { resolvedTheme: theme } = useTheme();

  const insertFourSpaces = ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: (tr: Transaction) => void;
  }) => {
    if (state.selection.ranges.some((range) => !range.empty)) {
      const changes = state.selection.ranges
        .map((range) => {
          const fromLine = state.doc.lineAt(range.from).number;
          const toLine = state.doc.lineAt(range.to).number;
          const changes = [];
          for (let line = fromLine; line <= toLine; line++) {
            const lineObj = state.doc.line(line);
            changes.push({ from: lineObj.from, insert: "    " });
          }
          return changes;
        })
        .flat();
      dispatch(state.update({ changes }));
    } else {
      dispatch(state.update(state.replaceSelection("    ")));
    }
    return true;
  };

  const removeFourSpaces = ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: (tr: Transaction) => void;
  }) => {
    if (state.selection.ranges.some((range) => !range.empty)) {
      const changes = state.selection.ranges
        .map((range) => {
          const fromLine = state.doc.lineAt(range.from).number;
          const toLine = state.doc.lineAt(range.to).number;
          const changes = [];
          for (let line = fromLine; line <= toLine; line++) {
            const lineObj = state.doc.line(line);
            const indent = lineObj.text.match(/^    /);
            if (indent) {
              changes.push({ from: lineObj.from, to: lineObj.from + 4 });
            }
          }
          return changes;
        })
        .flat();
      dispatch(state.update({ changes }));
    } else {
      const cursor = state.selection.main.head;
      const line = state.doc.lineAt(cursor);
      const beforeCursor = line.text.slice(0, cursor - line.from);
      const spacesToRemove = beforeCursor.match(/ {1,4}$/);
      if (spacesToRemove) {
        const removeCount = spacesToRemove[0].length;
        dispatch(
          state.update({
            changes: { from: cursor - removeCount, to: cursor },
          })
        );
      }
    }
    return true;
  };

  const getInitialDoc = useEffectEvent(() => value || placeholder);
  const handleDocChange = useEffectEvent((doc: string) => onChange(doc));

  useEffect(() => {
    if (!editorRef.current) return;

    const isDark = theme === 'dark';
    const bashLanguage = StreamLanguage.define(shell);

    const getThemeColors = () => ({
      background: isDark ? '#1e1e2e' : '#eff1f5',
      foreground: isDark ? '#cdd6f4' : '#4c4f69',
      border: isDark ? '#313244' : '#9ca0b0',
      surface: isDark ? '#313244' : '#ccd0da',
    });

    const colors = getThemeColors();

    const customTheme = EditorView.theme({
      "&": {
        backgroundColor: colors.background,
        color: colors.foreground,
        border: `1px solid ${colors.border}`,
        borderRadius: '0',
      },
      ".cm-content": {
        caretColor: colors.foreground,
        padding: '12px'
      },
      ".cm-gutters": {
        backgroundColor: colors.surface,
        color: colors.foreground,
        borderRight: `1px solid ${colors.border}`,
        opacity: '0.6',
      },
      ".cm-activeLineGutter": {
        backgroundColor: colors.surface,
        opacity: '1',
      },
      ".cm-scroller": {
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
      },
    }, { dark: isDark });

    const state = EditorState.create({
      doc: getInitialDoc(),
      extensions: [
        bashLanguage,
        customTheme,
        keymap.of([
          { key: "Tab", run: insertFourSpaces },
          { key: "Shift-Tab", run: removeFourSpaces },
        ]),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            handleDocChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            fontSize: "14px",
            fontFamily:
              'JetBrains Mono, Fira Code, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
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
              'JetBrains Mono, Fira Code, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
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
  }, [theme]);

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
            <TerminalIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2"
          >
            {copied ? (
              <CheckIcon className="h-3 w-3 mr-1" />
            ) : (
              <CopyIcon className="h-3 w-3 mr-1" />
            )}
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        </div>
      )}
      <div className="overflow-hidden h-full">
        <div ref={editorRef} className="h-full" />
      </div>
    </div>
  );
};
