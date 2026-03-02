"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EMPTY_FILTERS,
  applyFilters,
  buildDistinctValues,
  buildEffectiveVisibleColumns,
  buildPatchFromBoardDrop,
  buildRows,
  countCardsInColumn,
  hasAnyVisibleCards,
  parseUrlState,
  setMultiParam,
  type BoardUpdatePatch,
} from "./kanban.utils";
import { DEFAULT_CARD_FIELDS } from "./kanban.constants";
import type {
  BoardColumnKey,
  BoardDropTarget,
  CardFieldKey,
  DragCardPayload,
  FiltersState,
  GroupField,
  LaneRow,
  WorkPackage,
} from "./kanban.types";

/** Map OpenProject WP (HAL) -> náš WorkPackage shape (stejné jako v app/board/page.tsx) */
function mapApiWpToCard(wp: any): WorkPackage {
  const statusHref = wp?._links?.status?.href ?? null;
  const projectHref = wp?._links?.project?.href || "";
  const projectIdentifier = projectHref.split("/").filter(Boolean).pop() || "";

  return {
    id: wp.id,
    subject: wp.subject,
    lockVersion: wp.lockVersion,

    statusName: wp?._links?.status?.title || "Bez statusu",
    statusHref,
    statusColor: typeof wp?.statusColor === "string" ? wp.statusColor : null,

    priorityName: wp?._links?.priority?.title || "Bez priority",
    priorityHref: wp?._links?.priority?.href,

    assigneeName: wp?._links?.assignee?.title || "Nezařazeno",
    assigneeHref: wp?._links?.assignee?.href ?? null,

    projectName: wp?._links?.project?.title || "Bez projektu",
    projectIdentifier,
    projectHref: wp?._links?.project?.href,

    typeName: wp?._links?.type?.title || "Bez typu",
    typeHref: wp?._links?.type?.href,

    authorName: wp?._links?.author?.title || "Neznámý autor",
    authorHref: wp?._links?.author?.href,

    responsibleName: wp?._links?.responsible?.title || "Bez responsible",
    responsibleHref: wp?._links?.responsible?.href ?? null,
  };
}

function hrefKeyForField(
  field: GroupField
): "assigneeHref" | "priorityHref" | "typeHref" | "responsibleHref" | null {
  switch (field) {
    case "assigneeName":
      return "assigneeHref";
    case "priorityName":
      return "priorityHref";
    case "typeName":
      return "typeHref";
    case "responsibleName":
      return "responsibleHref";
    default:
      return null;
  }
}

function nameKeyForField(
  field: GroupField
): "assigneeName" | "priorityName" | "typeName" | "responsibleName" | null {
  switch (field) {
    case "assigneeName":
      return "assigneeName";
    case "priorityName":
      return "priorityName";
    case "typeName":
      return "typeName";
    case "responsibleName":
      return "responsibleName";
    default:
      return null;
  }
}

function applyLocalPatchToCard(card: WorkPackage, patch: BoardUpdatePatch): WorkPackage {
  const next: WorkPackage = { ...card };

  if (patch.statusColumnKey) {
    // dočasně nastavíme "statusName" tak, aby mapování do sloupce fungovalo okamžitě
    // (server pak vrátí skutečný status title)
    next.statusName = patch.statusColumnKey;
  }

  const applyLane = (p?: BoardUpdatePatch["swimline"] | BoardUpdatePatch["nestedSwimline"]) => {
    if (!p) return;
    const hk = hrefKeyForField(p.field);
    const nk = nameKeyForField(p.field);
    if (!hk || !nk) return;

    // apiValue je "/api/..." nebo null
    (next as any)[hk] = p.apiValue ?? null;
    (next as any)[nk] = p.label ?? "—";
  };

  applyLane(patch.swimline);
  applyLane(patch.nestedSwimline);

  return next;
}

function normalizeGrouping(rows: GroupField, nested: GroupField) {
  let r = rows;
  let n = nested;
  if (r === "none") n = "none";
  if (r !== "none" && n !== "none" && r === n) n = "none";
  return { rows: r, nested: n };
}

export function useKanbanBoardState(initialItems: WorkPackage[]) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const spKey = sp.toString();

  // items state
  const [items, setItems] = useState<WorkPackage[]>(() => initialItems);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // URL -> state (rows/nested/cols/fields + filter arrays)
  const parsed = useMemo(() => parseUrlState(new URLSearchParams(spKey)), [spKey]);

  const initialGrouping = useMemo(
    () => normalizeGrouping(parsed.rows, parsed.nested),
    [parsed.rows, parsed.nested]
  );

  const [rowGroupBy, setRowGroupBy] = useState<GroupField>(() => initialGrouping.rows);
  const [nestedRowGroupBy, setNestedRowGroupBy] = useState<GroupField>(() => initialGrouping.nested);
  const [extraColumns, setExtraColumns] = useState<BoardColumnKey[]>(() => parsed.extraColumns);
  const [extraCardFields, setExtraCardFields] = useState<CardFieldKey[]>(() => parsed.extraCardFields);

  const [filters, setFilters] = useState<FiltersState>(() => ({
    ...parsed.filters,
    q: "",
  }));

  // sync URL changes -> state (back/forward, pasted link)
  useEffect(() => {
    const p = parseUrlState(new URLSearchParams(sp.toString()));
    const g = normalizeGrouping(p.rows, p.nested);

    setRowGroupBy(g.rows);
    setNestedRowGroupBy(g.nested);
    setExtraColumns(p.extraColumns);
    setExtraCardFields(p.extraCardFields);

    // zachovej lokální q, ale načti URL filtry
    setFilters((prev) => ({
      ...prev,
      ...p.filters,
      q: prev.q,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spKey]);

  const nestedEnabled =
    rowGroupBy !== "none" &&
    nestedRowGroupBy !== "none" &&
    rowGroupBy !== nestedRowGroupBy;

  const distinctValues = useMemo(() => buildDistinctValues(items), [items]);

  const filteredItems = useMemo(() => applyFilters(items, filters), [items, filters]);

  const visibleColumns = useMemo(
    () => buildEffectiveVisibleColumns(extraColumns, filteredItems),
    [extraColumns, filteredItems]
  );

  const visibleCardFields = useMemo(() => {
    const all = [...DEFAULT_CARD_FIELDS, ...extraCardFields];
    return all.filter((k, i) => all.indexOf(k) === i);
  }, [extraCardFields]);

  const rows: LaneRow[] = useMemo(
    () =>
      buildRows({
        items: filteredItems,
        visibleColumns,
        rowGroupBy,
        nestedRowGroupBy,
      }),
    [filteredItems, visibleColumns, rowGroupBy, nestedRowGroupBy]
  );

  const primaryLaneCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.laneKey, (m.get(r.laneKey) ?? 0) + 1);
    return m;
  }, [rows]);

  const hasCards = useMemo(() => hasAnyVisibleCards(rows, visibleColumns), [rows, visibleColumns]);

  const countInColumn = useCallback(
    (c: BoardColumnKey) => countCardsInColumn(rows, c),
    [rows]
  );

  const replaceUrl = useCallback(
    (next: {
      rowGroupBy?: GroupField;
      nestedRowGroupBy?: GroupField;
      filters?: FiltersState;
      extraColumns?: BoardColumnKey[];
      extraCardFields?: CardFieldKey[];
    }) => {
      const g = normalizeGrouping(
        next.rowGroupBy ?? rowGroupBy,
        next.nestedRowGroupBy ?? nestedRowGroupBy
      );

      const cols = next.extraColumns ?? extraColumns;
      const fields = next.extraCardFields ?? extraCardFields;

      const f = next.filters ?? filters;

      const params = new URLSearchParams();

      if (g.rows !== "none") params.set("rows", g.rows);
      if (g.nested !== "none") params.set("nested", g.nested);

      if (cols.length) params.set("cols", cols.join(","));
      if (fields.length) params.set("fields", fields.join(","));

      // filters in URL (multi)
      setMultiParam(params, "status", f.statusName);
      setMultiParam(params, "priority", f.priorityName);
      setMultiParam(params, "assignee", f.assigneeName);
      setMultiParam(params, "project", f.projectName);
      setMultiParam(params, "type", f.typeName);
      setMultiParam(params, "author", f.authorName);
      setMultiParam(params, "responsible", f.responsibleName);

      const href = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(href, { scroll: false });
    },
    [router, pathname, rowGroupBy, nestedRowGroupBy, extraColumns, extraCardFields, filters]
  );

  const updateFilter = useCallback(
    <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value } as FiltersState;
        // q je lokální, necpeme do URL
        if (key !== "q") replaceUrl({ filters: next });
        return next;
      });
    },
    [replaceUrl]
  );

  const setQuickSearch = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, q: v }));
  }, []);

  const clearAll = useCallback(() => {
    const nextFilters: FiltersState = { ...EMPTY_FILTERS };
    setFilters(nextFilters);
    setRowGroupBy("none");
    setNestedRowGroupBy("none");
    setExtraColumns([]);
    setExtraCardFields([]);

    replaceUrl({
      rowGroupBy: "none",
      nestedRowGroupBy: "none",
      filters: nextFilters,
      extraColumns: [],
      extraCardFields: [],
    });
  }, [replaceUrl]);

  const copyShareLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }, []);

  // UI state
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const onDropCard = useCallback(
    async (drag: DragCardPayload, target: BoardDropTarget) => {
      const current = itemsRef.current;
      const card = current.find((c) => c.id === drag.cardId);
      if (!card) return;

      if (typeof card.lockVersion !== "number") return;

      const patch = buildPatchFromBoardDrop({
        card,
        fromColumnKey: drag.fromColumnKey,
        toColumnKey: target.columnKey,
        fromLaneKey: drag.fromLaneKey,
        toLaneKey: target.laneKey,
        fromNestedKey: drag.fromNestedKey,
        toNestedKey: target.nestedKey,
        rowGroupBy,
        nestedRowGroupBy,
        toLaneApiValue: target.laneApiValue,
        toNestedApiValue: target.nestedApiValue,
        toLaneLabel: target.laneLabel,
        toNestedLabel: target.nestedLabel,
      });

      if (!patch.statusColumnKey && !patch.swimline && !patch.nestedSwimline) return;

      const prevCard = card;
      const optimistic = applyLocalPatchToCard(prevCard, patch);

      // optimisticky posuň v UI
      setItems((prev) => prev.map((c) => (c.id === prevCard.id ? optimistic : c)));

      try {
        const body: any = { lockVersion: prevCard.lockVersion };

        if (patch.statusColumnKey) {
          body.boardMove = { statusColumnKey: patch.statusColumnKey };
        }

        if (patch.swimline) {
          const hk = hrefKeyForField(patch.swimline.field);
          if (hk) body[hk] = patch.swimline.apiValue ?? null;
        }

        if (patch.nestedSwimline) {
          const hk = hrefKeyForField(patch.nestedSwimline.field);
          if (hk) body[hk] = patch.nestedSwimline.apiValue ?? null;
        }

        const res = await fetch(`/api/work-packages/${prevCard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);

        const updated = mapApiWpToCard(data);
        setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch {
        // revert
        setItems((prev) => prev.map((c) => (c.id === prevCard.id ? prevCard : c)));
      }
    },
    [rowGroupBy, nestedRowGroupBy]
  );

  return {
    // data
    items,
    filteredItems,
    distinctValues,
    rows,
    visibleColumns,
    visibleCardFields,
    primaryLaneCounts,
    hasCards,

    // grouping
    rowGroupBy,
    nestedRowGroupBy,
    nestedEnabled,
    setRowGroupBy,
    setNestedRowGroupBy,

    // filters
    filters,
    updateFilter,
    setQuickSearch,

    // columns/fields
    extraColumns,
    setExtraColumns,
    extraCardFields,
    setExtraCardFields,

    // drawers
    boardSettingsOpen,
    setBoardSettingsOpen,
    selectedId,
    setSelectedId,

    // actions
    countInColumn,
    replaceUrl,
    clearAll,
    copyShareLink,
    onDropCard,
  };
}