import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Library } from "@/api/types";

interface Props {
  lib: Library;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteLibraryDialog({ lib, onConfirm, isPending }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="destructive"
        size="icon-xs"
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={`Remove library "${lib.name}"`}
      >
        <Trash2 className="size-3" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{lib.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the library entry from SpotiStorage. Your music files at{" "}
              <code className="text-xs">{lib.root_path}</code> stay on disk untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => { onConfirm(); setOpen(false); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
