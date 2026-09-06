import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateLibrary } from "@/hooks/useConfig";
import { StepFolder } from "./StepFolder";
import { StepDeps } from "./StepDeps";
import { getErrorMessage } from "@/api/client";

type Step = "folder" | "deps";

const STEPS: Step[] = ["folder", "deps"];

export function SetupWizard() {
  const [step, setStep] = useState<Step>("folder");
  const [error, setError] = useState<string | null>(null);
  const createLibrary = useCreateLibrary();
  const navigate = useNavigate();

  const stepIndex = STEPS.indexOf(step);

  const handleFolderNext = async (name: string, path: string) => {
    setError(null);
    try {
      await createLibrary.mutateAsync({ name, path });
      setStep("deps");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-1">SpotiStorage</h1>
        <p className="text-sm text-muted-foreground">First-time setup</p>
      </div>

      <div className="flex gap-1.5 mb-8 justify-center">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full w-14 transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}
        {step === "folder" && (
          <StepFolder
            onNext={handleFolderNext}
            isPending={createLibrary.isPending}
          />
        )}
        {step === "deps" && (
          <StepDeps
            onBack={() => setStep("folder")}
            onNext={() => navigate("/library")}
          />
        )}
      </div>
    </div>
  );
}
