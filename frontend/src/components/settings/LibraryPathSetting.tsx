import { useState, type FormEvent } from "react";
import { FolderOpen, Plus, Loader2 } from "lucide-react";
import { useConfig, useCreateLibrary } from "@/hooks/useConfig";
import { useDeleteLibrary, useBrowseFolder, useSwitchLibrary } from "@/hooks/useLibrary";
import { DeleteLibraryDialog } from "./DeleteLibraryDialog";
import { cn } from "@/lib/utils";
import { showError } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LibraryPathSetting() {
  const { data: config } = useConfig();
  const createLibrary = useCreateLibrary();
  const deleteLibrary = useDeleteLibrary();
  const switchLibrary = useSwitchLibrary();
  const { browse, isBrowsing } = useBrowseFolder();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");

  if (!config) return null;

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!path.trim() || !name.trim()) return;
    createLibrary.mutate(
      { name: name.trim(), path: path.trim() },
      {
        onSuccess: () => { setPath(""); setName("My Music"); },
        onError: (e) => showError(e, "Failed to add library"),
      }
    );
  };

  return (
    <div className="space-y-5">
      {config.libraries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Libraries</p>
          <div className="space-y-1">
            {config.libraries.map((lib) => {
              const isActive = lib.id === config.active_library_id;
              return (
                <div
                  key={lib.id}
                  onClick={isActive ? undefined : () => switchLibrary.mutate({ config, libraryId: lib.id })}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm border transition-colors",
                    isActive
                      ? "border-border bg-muted/50"
                      : "border-transparent hover:bg-muted/40 cursor-pointer"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{lib.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{lib.root_path}</p>
                  </div>
                  {isActive ? (
                    <span className="text-xs text-muted-foreground shrink-0">active</span>
                  ) : (
                    <DeleteLibraryDialog
                      lib={lib}
                      onConfirm={() => deleteLibrary.mutate(lib.id)}
                      isPending={deleteLibrary.isPending}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Add library folder</p>
        <div className="space-y-1.5">
          <div className="flex flex-col gap-3">
            <Label htmlFor="add-lib-name">Name</Label>
            <Input
              id="add-lib-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Music"
              disabled={createLibrary.isPending}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="add-lib-path">Folder path</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="add-lib-path"
                  className="pl-8"
                  placeholder="C:\Music"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  disabled={createLibrary.isPending}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => browse(setPath)}
                disabled={isBrowsing || createLibrary.isPending}
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
          type="submit"
          size="sm"
          disabled={!path.trim() || !name.trim() || createLibrary.isPending}
        >
          {createLibrary.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add library
        </Button>
      </form>
    </div>
  );
}
