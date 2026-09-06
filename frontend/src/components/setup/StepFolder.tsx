import { useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBrowseFolder } from "@/hooks/useLibrary";

interface Props {
  onNext: (name: string, path: string) => void;
  isPending?: boolean;
}

export function StepFolder({ onNext, isPending }: Props) {
  const [name, setName] = useState("My Music");
  const [path, setPath] = useState("");
  const { browse, isBrowsing } = useBrowseFolder();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Choose music folder</h2>
        <p className="text-sm text-muted-foreground">
          All downloaded MP3s will be organized here. You can copy this folder to any device.
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="lib-name">Library name</Label>
          <Input
            id="lib-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Music"
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
                placeholder="C:\Music"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => browse(setPath)}
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
      <Button
        disabled={!path.trim() || !name.trim() || isPending}
        onClick={() => onNext(name.trim(), path.trim())}
        className="w-full sm:w-auto"
      >
        Continue
      </Button>
    </div>
  );
}
