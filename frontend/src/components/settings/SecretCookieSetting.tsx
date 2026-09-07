import { useState, type ReactNode } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Eye, EyeOff, Save, Loader2, X } from "lucide-react";
import { showSuccess } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/common/CopyButton";

interface Props {
  id: string;
  label: string;
  placeholder: string;
  savedValue: string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutation: UseMutationResult<any, unknown, string | null>;
  savedMessage: string;
  removedMessage: string;
  helpText: ReactNode;
}

export function SecretCookieSetting({
  id, label, placeholder, savedValue, mutation, savedMessage, removedMessage, helpText,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);

  const saved = savedValue ?? "";
  const value = draft ?? saved;
  const isDirty = draft !== null && draft !== saved;

  const handleSave = () => {
    mutation.mutate(draft!.trim() || null, {
      onSuccess: () => {
        showSuccess(savedMessage);
        setDraft(null);
      },
    });
  };

  const handleClear = () => {
    mutation.mutate(null, {
      onSuccess: () => {
        showSuccess(removedMessage);
        setDraft(null);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              id={id}
              type={showValue ? "text" : "password"}
              className="pr-16 font-mono text-xs"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setDraft(e.target.value)}
              disabled={mutation.isPending}
            />
            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-2.5">
              {value && <CopyButton value={value} />}
              <button
                type="button"
                className="p-2.5 -m-2.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowValue((v) => !v)}
                aria-label={showValue ? "Hide" : "Show"}
              >
                {showValue ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          {isDirty && (
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save
            </Button>
          )}
          {saved && !isDirty && (
            <Button variant="outline" onClick={handleClear} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}
