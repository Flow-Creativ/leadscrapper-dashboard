"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QueryWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onUseSuggestion: (suggestion: string) => void;
  message: string | null;
  suggestions: string[];
}

export function QueryWarningModal({
  isOpen,
  onClose,
  onProceed,
  onUseSuggestion,
  message,
  suggestions,
}: QueryWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Query May Return Few Results
          </DialogTitle>
          <DialogDescription>
            {message || "This query may not work well with Google Maps."}
          </DialogDescription>
        </DialogHeader>

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Try one of these instead:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onUseSuggestion(suggestion)}
                  className="text-sm px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Edit Query
          </Button>
          <Button variant="secondary" onClick={onProceed}>
            Scrape Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
