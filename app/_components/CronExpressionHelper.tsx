'use client'

import { useState, useEffect } from 'react';
import { parseCronExpression, cronPatterns, type CronExplanation } from '../_utils/cronParser';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Clock, Info, CheckCircle, AlertCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface CronExpressionHelperProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    showPatterns?: boolean;
}

export function CronExpressionHelper({
    value,
    onChange,
    placeholder = "* * * * *",
    className = "",
    showPatterns = true
}: CronExpressionHelperProps) {
    const [explanation, setExplanation] = useState<CronExplanation | null>(null);
    const [showPatternsPanel, setShowPatternsPanel] = useState(false);
    const [debouncedValue, setDebouncedValue] = useState(value);

    // Debounce the input to avoid too many calculations
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, 300);

        return () => clearTimeout(timer);
    }, [value]);

    // Parse cron expression when debounced value changes
    useEffect(() => {
        if (debouncedValue) {
            const result = parseCronExpression(debouncedValue);
            setExplanation(result);
        } else {
            setExplanation(null);
        }
    }, [debouncedValue]);

    const handlePatternSelect = (pattern: string) => {
        onChange(pattern);
        setShowPatternsPanel(false);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Input with real-time feedback */}
            <div className="relative">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="font-mono text-lg pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {explanation?.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : value ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Real-time explanation */}
            {explanation && (
                <Card className="glass-card-hover">
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {/* Human readable description */}
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">
                                        {explanation.isValid ? explanation.humanReadable : 'Invalid Expression'}
                                    </p>
                                    {explanation.error && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                            {explanation.error}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Next run times */}
                            {explanation.isValid && explanation.nextRuns.length > 0 && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground mb-2">Next 5 executions:</p>
                                        <div className="space-y-1">
                                            {explanation.nextRuns.map((time, index) => (
                                                <p key={index} className="text-sm text-muted-foreground">
                                                    {time}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick patterns panel */}
            {showPatterns && (
                <Card className="glass-card">
                    <CardHeader>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowPatternsPanel(!showPatternsPanel);
                            }}
                            className="w-full text-left"
                        >
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Quick Patterns</CardTitle>
                                <div className="p-1">
                                    {showPatternsPanel ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </div>
                            </div>
                        </button>
                    </CardHeader>

                    {showPatternsPanel && (
                        <CardContent className="pt-0">
                            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                                {cronPatterns.map((category) => (
                                    <div key={category.category} className="space-y-2">
                                        <h4 className="font-medium text-foreground text-sm">
                                            {category.category}
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {category.patterns.map((pattern) => (
                                                <Button
                                                    key={pattern.value}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePatternSelect(pattern.value)}
                                                    className="justify-start text-left h-auto p-3"
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-mono text-xs text-primary mb-1">
                                                            {pattern.value}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {pattern.description}
                                                        </div>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
}
