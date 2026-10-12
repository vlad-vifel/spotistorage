import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { pluralize } from "@/lib/utils";

interface Props {
  count: number;
  scope: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function DeleteRemovedDialog({ count, scope, open, onOpenChange, onConfirm, isPending }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="md:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {pluralize(count, "removed track")}?</AlertDialogTitle>
          <AlertDialogDescription>
            These tracks are no longer in {scope} on Spotify, but their MP3 files are still on your device.
            The files will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
            onClick={onConfirm}
            disabled={isPending}
          >
            Delete {count === 1 ? "file" : "files"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
