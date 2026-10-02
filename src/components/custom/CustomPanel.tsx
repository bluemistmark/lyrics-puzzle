import { useState } from "react";
import { CustomList } from "./CustomList";
import { CustomPlay } from "./CustomPlay";
import { useCustom } from "../../customStore";

type Props = { hidden: boolean };

export function CustomPanel({ hidden }: Props) {
  const puzzles = useCustom((s) => s.puzzles);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = puzzles.find((p) => p.id === activeId);
  return (
    <div
      id="custom-panel"
      role="tabpanel"
      aria-labelledby="custom-tab"
      hidden={hidden}
      className="custom-panel"
    >
      {active ? (
        <CustomPlay
          key={active.id}
          puzzle={active}
          onBack={() => setActiveId(null)}
        />
      ) : (
        <CustomList puzzles={puzzles} onOpen={setActiveId} />
      )}
    </div>
  );
}
