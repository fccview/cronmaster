"use client";

import { useState, useEffect } from "react";
import {
  parseCronExpression,
  cronPatterns,
  type CronExplanation,
} from "../_utils/cronParser";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import {
  Clock,
  Info,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface CronExpressionHelperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showPatterns?: boolean;
}

export const CronExpressionHelper = ({
  value,
  onChange,
  placeholder = "* * * * *",
  className = "",
  showPatterns = true,
}: CronExpressionHelperProps) => {
  const [explanation, setExplanation] = useState<CronExplanation | null>(null);
  const [showPatternsPanel, setShowPatternsPanel] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [patternSearch, setPatternSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

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

  const filteredPatterns = cronPatterns
    .map((category) => ({
      ...category,
      patterns: category.patterns.filter(
        (pattern) =>
          pattern.value.toLowerCase().includes(patternSearch.toLowerCase()) ||
          pattern.description
            .toLowerCase()
            .includes(patternSearch.toLowerCase())
      ),
    }))
    .filter((category) => category.patterns.length > 0);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {explanation?.isValid ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : value ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {explanation && (
        <div className="bg-muted/30 rounded p-2 border border-border/30">
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Info className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs italic text-muted-foreground">
                  {explanation.isValid
                    ? explanation.humanReadable
                    : "Invalid Expression"}
                </p>
                {explanation.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {explanation.error}
                  </p>
                )}
              </div>
            </div>

            {explanation.isValid && explanation.nextRuns.length > 0 && (
              <div className="flex items-start gap-2">
                <Calendar className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    Next executions:
                  </p>
                  <div className="space-y-0.5">
                    {explanation.nextRuns.slice(0, 3).map((time, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {time}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showPatterns && (
        <div className="bg-muted/30 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPatternsPanel(!showPatternsPanel);
            }}
            className="w-full text-left p-3 hover:bg-accent/30 transition-colors rounded-t-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quick Patterns</span>
              <div className="p-1">
                {showPatternsPanel ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </button>

          {showPatternsPanel && (
            <div className="p-3 border-t border-border/50">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={patternSearch}
                  onChange={(e) => setPatternSearch(e.target.value)}
                  placeholder="Search patterns..."
                  className="pl-9"
                />
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {filteredPatterns.map((category) => (
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
                          className="justify-start text-left h-auto p-3 min-w-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs text-primary mb-1 truncate">
                              {pattern.value}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {pattern.description}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredPatterns.length === 0 && patternSearch && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No patterns found for "{patternSearch}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
