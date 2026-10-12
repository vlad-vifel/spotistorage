import type { Source } from "../../api/types";
import { SourceCard } from "./SourceCard";

interface Props {
  sources: Source[];
}

export function SourceList({ sources }: Props) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {sources.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  );
}
