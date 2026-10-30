import { formatSort, parseSort, toggleSort, type Sort } from "./table.ts";
import { useRouteParam } from "./useRoute";

/** The list's sort, kept in the URL (`sort=-title`) like the other filters. */
export function useSortParam<K extends string>(
  keys: readonly K[],
  fallback: Sort<K>,
) {
  const [raw, setRaw] = useRouteParam("sort");
  const sort = parseSort(raw, keys, fallback);
  const change = (key: K, firstDesc = false) => {
    const next = toggleSort(sort, key, firstDesc);
    // The default order leaves no trace in the URL.
    setRaw(
      next.key === fallback.key && next.desc === fallback.desc
        ? ""
        : formatSort(next),
    );
  };
  return [sort, change] as const;
}

type Props<K extends string> = {
  label: string;
  sortKey: K;
  sort: Sort<K>;
  onSort: (key: K, firstDesc?: boolean) => void;
  /** Start descending (numbers and dates: biggest or newest first). */
  firstDesc?: boolean;
};

/** A table header cell that sorts by its column when clicked. */
export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  firstDesc = false,
}: Props<K>) {
  const active = sort.key === sortKey;
  return (
    <th aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        className={active ? "sort-header active" : "sort-header"}
        onClick={() => onSort(sortKey, firstDesc)}
      >
        {label}
        <span aria-hidden="true">{active ? (sort.desc ? "▼" : "▲") : "↕"}</span>
      </button>
    </th>
  );
}
