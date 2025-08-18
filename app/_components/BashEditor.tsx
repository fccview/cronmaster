'use client'

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Terminal, Copy, Check, Edit3 } from 'lucide-react';

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
    label = "Bash Script"
}: BashEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFocus = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const SyntaxHighlighterComponent = SyntaxHighlighter as any;

    return (
        <Card className={`glass-card ${className}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-cyan-500" />
                        <CardTitle className="text-lg">{label}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="btn-outline"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 mr-2" />
                            ) : (
                                <Copy className="h-4 w-4 mr-2" />
                            )}
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="relative">
                        <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder={placeholder}
                            className="w-full h-64 p-4 border border-border rounded-lg bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 relative z-10"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'transparent',
                                caretColor: 'hsl(var(--foreground))',
                                background: 'transparent'
                            }}
                        />
                        <div
                            className="absolute inset-0 p-4 pointer-events-none overflow-auto"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            <SyntaxHighlighterComponent
                                language="bash"
                                style={oneDark}
                                customStyle={{
                                    margin: 0,
                                    background: 'transparent',
                                    padding: 0,
                                    fontSize: '0.875rem',
                                    fontFamily: 'var(--font-mono)',
                                }}
                                codeTagProps={{
                                    style: {
                                        fontFamily: 'var(--font-mono)',
                                        lineHeight: '1.5',
                                        background: 'transparent',
                                    }
                                }}
                            >
                                {value || placeholder}
                            </SyntaxHighlighterComponent>
                        </div>

                        {/* Click to edit overlay */}
                        {!isEditing && (
                            <div
                                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-background/90 transition-colors"
                                onClick={() => {
                                    const textarea = document.querySelector('textarea');
                                    textarea?.focus();
                                }}
                            >
                                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                                    <Edit3 className="h-5 w-5" />
                                    <span className="text-sm font-medium">Click here to edit</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        💡 Tip: Use bash syntax like variables ($VAR), conditionals (if/then/fi), and loops (for/while)
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
