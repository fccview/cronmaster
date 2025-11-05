"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { FileText, Search, Check, Terminal } from "lucide-react";
import { Script } from "@/app/_utils/scriptScanner";
import { getScriptContent } from "@/app/_server/actions/scripts";
import { getHostScriptPath } from "@/app/_utils/scripts";

interface SelectScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scripts: Script[];
  onScriptSelect: (script: Script) => void;
  selectedScriptId: string | null;
}

export const SelectScriptModal = ({
  isOpen,
  onClose,
  scripts,
  onScriptSelect,
  selectedScriptId,
}: SelectScriptModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewScript, setPreviewScript] = useState<Script | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [hostScriptPath, setHostScriptPath] = useState<string>("");

  useEffect(() => {
    const fetchHostScriptPath = async () => {
      const path = await getHostScriptPath(previewScript?.filename || "");
      setHostScriptPath(path);
    };

    if (previewScript) {
      fetchHostScriptPath();
    }
  }, [previewScript]);

  const filteredScripts = scripts.filter(
    (script) =>
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScriptClick = async (script: Script) => {
    setPreviewScript(script);
    try {
      const content = await getScriptContent(script.filename);
      setPreviewContent(content);
    } catch (error) {
      setPreviewContent("Error loading script content");
    }
  };

  const handleSelectScript = () => {
    if (previewScript) {
      onScriptSelect(previewScript);
      onClose();
      setSearchQuery("");
      setPreviewScript(null);
      setPreviewContent("");
    }
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
    setPreviewScript(null);
    setPreviewContent("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Script"
      size="xl"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scripts..."
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">
                Available Scripts ({filteredScripts.length})
              </h3>
            </div>
            <div className="overflow-y-auto h-full max-h-80">
              {filteredScripts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? "No scripts found" : "No scripts available"}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredScripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => handleScriptClick(script)}
                      className={`w-full p-4 text-left hover:bg-accent/30 transition-colors ${previewScript?.id === script.id
                        ? "bg-primary/5 border-r-2 border-primary"
                        : ""
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <h4 className="font-medium text-foreground truncate">
                              {script.name}
                            </h4>
                            {selectedScriptId === script.id && (
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {script.description}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(script.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">
                Script Preview
              </h3>
            </div>
            <div className="p-4 h-full max-h-80 overflow-y-auto">
              {previewScript ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">
                      {previewScript.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {previewScript.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        Command Preview
                      </span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded border border-border/30">
                      <code className="text-sm font-mono text-foreground break-all">
                        {hostScriptPath}
                      </code>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Script Content
                    </span>
                    <div className="bg-muted/30 p-3 rounded border border-border/30 mt-2 max-h-32 overflow-auto">
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                        {previewContent}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a script to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="btn-outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSelectScript}
            disabled={!previewScript}
            className="btn-primary glow-primary"
          >
            <Check className="h-4 w-4 mr-2" />
            Select Script
          </Button>
        </div>
      </div>
    </Modal>
  );
}
