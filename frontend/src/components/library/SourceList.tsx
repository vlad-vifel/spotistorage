import type { Source } from "../../api/types";
import { SourceCard } from "./SourceCard";

interface Props {
  sources: Source[];
}

export function SourceList({ sources }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {sources.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  );
}
