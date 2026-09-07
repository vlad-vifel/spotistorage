import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateLibrary } from "@/hooks/useConfig";
import { useSetupSteps, type SetupStep } from "@/hooks/useSetupSteps";
import { getErrorMessage } from "@/api/client";
import { StepWelcome } from "./StepWelcome";
import { StepPermissions } from "./StepPermissions";
import { StepFolder } from "./StepFolder";
import { StepDeps } from "./StepDeps";

export function SetupWizard() {
  const steps = useSetupSteps();
  const [step, setStep] = useState<SetupStep>("welcome");
  const [error, setError] = useState<string | null>(null);
  const createLibrary = useCreateLibrary();
  const navigate = useNavigate();

  const stepIndex = steps.indexOf(step);

  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const handleFolderNext = async (name: string, path: string) => {
    setError(null);
    try {
      await createLibrary.mutateAsync({ name, path });
      goNext();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-8 md:mt-16 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-1">SpotiStorage</h1>
        <p className="text-sm text-muted-foreground">First-time setup</p>
      </div>

      <div className="flex gap-1.5 mb-8 justify-center">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full flex-1 max-w-14 transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4 md:p-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}
        {step === "welcome" && <StepWelcome onNext={goNext} />}
        {step === "permissions" && <StepPermissions onBack={goBack} onNext={goNext} />}
        {step === "folder" && (
          <StepFolder onNext={handleFolderNext} onBack={goBack} isPending={createLibrary.isPending} />
        )}
        {step === "deps" && <StepDeps onBack={goBack} onNext={() => navigate("/library")} />}
      </div>
    </div>
  );
}
