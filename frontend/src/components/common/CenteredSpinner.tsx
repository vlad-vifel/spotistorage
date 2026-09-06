import { Spinner } from "@/components/ui/spinner";

export function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={24} />
    </div>
  );
}
