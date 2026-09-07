import { Button } from "@/components/ui/button";

interface Props {
  onNext: () => void;
}

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold mb-1">Welcome to SpotiStorage</h2>
        <p className="text-sm text-muted-foreground">
          Paste a Spotify link, download the tracks as real MP3 files, and keep them organized
          on your own device - no streaming, no cloud, no lock-in.
        </p>
      </div>
      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={onNext}>Get started</Button>
      </div>
    </div>
  );
}
