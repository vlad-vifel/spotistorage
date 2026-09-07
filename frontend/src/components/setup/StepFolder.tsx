import { useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBrowseFolder } from "@/hooks/useLibrary";
import { isAndroid, pickLibraryFolder } from "@/lib/androidBridge";

interface Props {
  onNext: (name: string, path: string) => void;
  onBack?: () => void;
  isPending?: boolean;
}

export function StepFolder({ onNext, onBack, isPending }: Props) {
  const android = isAndroid();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const { browse, isBrowsing } = useBrowseFolder();

  const handleBrowseClick = () => {
    if (android) {
      pickLibraryFolder(setPath);
    } else {
      browse(setPath);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold mb-1">Choose music folder</h2>
        <p className="text-sm text-muted-foreground">
          All downloaded MP3s will be organized here. You can copy this folder to any device.
        </p>
      </div>
      <div className="space-y-4 md:space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="lib-name">Library name</Label>
          <Input
            id="lib-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lib-path">Folder path</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="lib-path"
                className="pl-8"
                placeholder="Path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={handleBrowseClick}
              disabled={isBrowsing || isPending}
              aria-label="Browse for folder"
            >
              {isBrowsing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FolderOpen className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isPending}>Back</Button>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          disabled={!path.trim() || !name.trim() || isPending}
          onClick={() => onNext(name.trim(), path.trim())}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
