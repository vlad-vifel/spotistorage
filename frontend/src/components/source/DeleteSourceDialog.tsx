import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { capitalize } from "@/lib/utils";
import type { Source } from "@/api/types";

interface DeleteSourceDialogProps {
  source: Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function DeleteSourceDialog({
  source,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteSourceDialogProps) {
  const typeLabel = capitalize(source.type);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="md:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete "{source.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This will permanently delete the {typeLabel.toLowerCase()} and all{" "}
                {source.downloaded_tracks > 0 ? (
                  <><span className="text-foreground font-medium">{source.downloaded_tracks} downloaded file{source.downloaded_tracks !== 1 ? "s" : ""}</span> from disk.</>
                ) : (
                  "files from disk."
                )}
              </p>
              {source.folder_path && (
                <p className="font-mono text-sm text-foreground font-semibold max-md:break-all max-md:whitespace-normal md:whitespace-nowrap md:overflow-x-auto">
                  {source.folder_path}
                </p>
              )}
              <p>This action cannot be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
            onClick={onConfirm}
            disabled={isPending}
          >
            Delete {typeLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
