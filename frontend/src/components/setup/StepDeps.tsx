import { DependencyStatus } from "../settings/DependencyStatus";
import { useDeps, useCompleteSetup } from "@/hooks/useConfig";
import { Button } from "@/components/ui/button";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function StepDeps({ onBack, onNext }: Props) {
  const { data: deps } = useDeps();
  const completeSetup = useCompleteSetup();

  const finish = () => {
    completeSetup.mutate(undefined, { onSuccess: onNext });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold mb-1">Check dependencies</h2>
        <p className="text-sm text-muted-foreground">
          SpotiStorage needs FFmpeg and yt-dlp installed on your system.
          Install them manually - the app will never install them for you.
        </p>
      </div>
      <DependencyStatus />
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={completeSetup.isPending}>Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={finish} disabled={completeSetup.isPending}>
            Skip for now
          </Button>
          <Button size="sm" disabled={!deps?.all_ok || completeSetup.isPending} onClick={finish}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
