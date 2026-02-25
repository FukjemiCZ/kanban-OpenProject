"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_CARD_FIELDS, DEFAULT_COLUMN_KEYS, GROUP_OPTIONS } from "./kanban.constants";
import type {
  BoardColumnKey,
  BoardDropTarget,
  CardFieldKey,
  DragCardPayload,
  FiltersState,
  GroupField,
  WorkPackage,
} from "./kanban.types";
import {
  EMPTY_FILTERS,
  applyFilters,
  buildDistinctValues,
  buildEffectiveVisibleColumns,
  buildPatchFromBoardDrop,
  buildRows,
  countCardsInColumn,
  hasAnyVisibleCards,
  mapStatusToColumnKey,
  parseUrlState,
  setMultiParam,
} from "./kanban.utils";

function applyLocalPatchToCard(
  card: WorkPackage,
  patch: {
    status?: { name: string; href?: string };
    assignee?: { name: string; href: string | null };
    priority?: { name: string; href?: string };
    type?: { name: string; href?: string };
    responsible?: { name: string; href: string | null };
  }
): WorkPackage {
  const next = { ...card };

  if (patch.status) {
    next.statusName = patch.status.name;
    if (patch.status.href) next.statusHref = patch.status.href;
  }
  if (patch.assignee) {
    next.assigneeName = patch.assignee.name;
    next.assigneeHref = patch.assignee.href;
  }
  if (patch.priority) {
    next.priorityName = patch.priority.name;
    if (patch.priority.href) next.priorityHref = patch.priority.href;
  }
  if (patch.type) {
    next.typeName = patch.type.name;
    if (patch.type.href) next.typeHref = patch.type.href;
  }
  if (patch.responsible) {
    next.responsibleName = patch.responsible.name;
    next.responsibleHref = patch.responsible.href;
  }

  return next;
}

function opValueToLinkPatch(field: GroupField, apiValue: string | null | undefined) {
  if (field === "assigneeName") return { assigneeHref: apiValue ?? null };
  if (field === "priorityName" && apiValue) return { priorityHref: apiValue };
  if (field === "typeName" && apiValue) return { typeHref: apiValue };
  if (field === "responsibleName") return { responsibleHref: apiValue ?? null };
  return {};
}

function applySwimlineLocalPatch(card: WorkPackage, field: GroupField, target: BoardDropTarget, nested = false) {
  const label = nested ? (target.nestedLabel ?? "—") : target.laneLabel;
  const apiValue = nested ? target.nestedApiValue : target.laneApiValue;

  switch (field) {
    case "assigneeName":
      return applyLocalPatchToCard(card, {
        assignee: { name: label, href: apiValue ?? null },
      });
    case "priorityName":
      return applyLocalPatchToCard(card, {
        priority: { name: label, href: apiValue ?? undefined },
      });
    case "typeName":
      return applyLocalPatchToCard(card, {
        type: { name: label, href: apiValue ?? undefined },
      });
    case "responsibleName":
      return applyLocalPatchToCard(card, {
        responsible: { name: label, href: apiValue ?? null },
      });
    default:
      return card;
  }
}

export function useKanbanBoardState(initialItems: WorkPackage[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<WorkPackage[]>(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);

  const [rowGroupBy, setRowGroupBy] = useState<GroupField>("assigneeName");
  const [nestedRowGroupBy, setNestedRowGroupBy] = useState<GroupField>("none");

  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [extraColumns, setExtraColumns] = useState<BoardColumnKey[]>([]);
  const [extraCardFields, setExtraCardFields] = useState<CardFieldKey[]>([]);

  useEffect(() => {
    const parsed = parseUrlState(new URLSearchParams(searchParams.toString()));
    const validGroupValues = new Set(GROUP_OPTIONS.map((g) => g.value));

    const rowsParam = searchParams.get("rows");
    const safeRows =
      rowsParam === null ? "assigneeName" : validGroupValues.has(parsed.rows) ? parsed.rows : "assigneeName";

    const safeNested = validGroupValues.has(parsed.nested) ? parsed.nested : "none";

    setRowGroupBy(safeRows);
    setNestedRowGroupBy(safeNested === safeRows ? "none" : safeNested);
    setFilters((prev) => ({ ...parsed.filters, q: prev.q }));
    setExtraColumns(parsed.extraColumns);
    setExtraCardFields(parsed.extraCardFields);
  }, [searchParams]);

  const distinctValues = useMemo(() => buildDistinctValues(items), [items]);

  const filteredItems = useMemo(() => applyFilters(items, filters), [items, filters]);

  const visibleColumns = useMemo(
    () => buildEffectiveVisibleColumns(extraColumns, filteredItems),
    [extraColumns, filteredItems]
  );

  const rows = useMemo(
    () =>
      buildRows({
        items: filteredItems,
        visibleColumns,
        rowGroupBy,
        nestedRowGroupBy,
      }),
    [filteredItems, visibleColumns, rowGroupBy, nestedRowGroupBy]
  );

  const nestedEnabled =
    rowGroupBy !== "none" && nestedRowGroupBy !== "none" && rowGroupBy !== nestedRowGroupBy;

  const primaryLaneCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.laneKey, (map.get(row.laneKey) ?? 0) + 1);
    return map;
  }, [rows]);

  const visibleCardFields = useMemo(
    () => [...DEFAULT_CARD_FIELDS, ...extraCardFields.filter((f) => !DEFAULT_CARD_FIELDS.includes(f))],
    [extraCardFields]
  );

  const replaceUrl = useCallback(
    (next: {
      rowGroupBy?: GroupField;
      nestedRowGroupBy?: GroupField;
      filters?: FiltersState;
      extraColumns?: BoardColumnKey[];
      extraCardFields?: CardFieldKey[];
    }) => {
      const rg = next.rowGroupBy ?? rowGroupBy;
      const ng = next.nestedRowGroupBy ?? nestedRowGroupBy;
      const f = next.filters ?? filters;
      const cols = next.extraColumns ?? extraColumns;
      const fields = next.extraCardFields ?? extraCardFields;

      const params = new URLSearchParams();

      if (rg !== "assigneeName") params.set("rows", rg);
      if (ng !== "none" && ng !== rg) params.set("nested", ng);

      setMultiParam(params, "status", f.statusName);
      setMultiParam(params, "priority", f.priorityName);
      setMultiParam(params, "assignee", f.assigneeName);
      setMultiParam(params, "project", f.projectName);
      setMultiParam(params, "type", f.typeName);
      setMultiParam(params, "author", f.authorName);
      setMultiParam(params, "responsible", f.responsibleName);

      const extraOnlyCols = cols.filter((c) => !DEFAULT_COLUMN_KEYS.includes(c));
      if (extraOnlyCols.length) params.set("cols", extraOnlyCols.join(","));

      if (fields.length) params.set("fields", fields.join(","));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, rowGroupBy, nestedRowGroupBy, filters, extraColumns, extraCardFields]
  );

  const updateFilter = useCallback(
    <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
      const nextFilters = { ...filters, [key]: value };
      setFilters(nextFilters);
      if (key === "q") return;
      replaceUrl({ filters: nextFilters });
    },
    [filters, replaceUrl]
  );

  const setQuickSearch = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, q }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setRowGroupBy("assigneeName");
    setNestedRowGroupBy("none");
    setExtraColumns([]);
    setExtraCardFields([]);

    replaceUrl({
      rowGroupBy: "assigneeName",
      nestedRowGroupBy: "none",
      filters: EMPTY_FILTERS,
      extraColumns: [],
      extraCardFields: [],
    });
  }, [replaceUrl]);

  const copyShareLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // noop
    }
  }, []);

  const countInColumn = useCallback(
    (columnKey: BoardColumnKey) => countCardsInColumn(rows, columnKey),
    [rows]
  );

  const hasCards = useMemo(() => hasAnyVisibleCards(rows, visibleColumns), [rows, visibleColumns]);

  /**
   * Kandidáti statusů pro cílový sloupec — bereme nejčastější status+href, který v tom sloupci aktuálně existuje.
   * NOTE: Přidáváme i statusColor mapu podle statusHref, aby šla barva nastavit optimisticky.
   */
  const statusCandidatesByColumn = useMemo(() => {
    const map = new Map<
      BoardColumnKey,
      Array<{ name: string; href?: string; count: number; color?: string | null }>
    >();

    const agg = new Map<
      BoardColumnKey,
      Map<string, { name: string; href?: string; count: number; color?: string | null }>
    >();

    // statusHref -> color (z již nahraných items)
    const colorByHref = new Map<string, string>();
    for (const it of items) {
      if (it.statusHref && it.statusColor) colorByHref.set(it.statusHref, it.statusColor);
    }

    for (const item of items) {
      const col = mapStatusToColumnKey(item.statusName);
      if (!agg.has(col)) agg.set(col, new Map());
      const k = `${item.statusName}__${item.statusHref ?? ""}`;

      const inner = agg.get(col)!;
      const ex = inner.get(k);
      const color = item.statusHref ? colorByHref.get(item.statusHref) ?? item.statusColor ?? null : null;

      if (ex) ex.count += 1;
      else inner.set(k, { name: item.statusName, href: item.statusHref, count: 1, color });
    }

    for (const [col, inner] of agg.entries()) {
      map.set(
        col,
        [...inner.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "cs"))
      );
    }

    return map;
  }, [items]);

  const onDropCard = useCallback(
    async (drag: DragCardPayload, target: BoardDropTarget) => {
      const card = items.find((i) => i.id === drag.cardId);
      if (!card) return;

      const patchSpec = buildPatchFromBoardDrop({
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

      if (!patchSpec.statusColumnKey && !patchSpec.swimline && !patchSpec.nestedSwimline) {
        return;
      }

      const prevItems = items;
      let optimisticCard: WorkPackage = card;
      const linkPatch: Record<string, string | null | undefined> = {};

      // ✅ status drop: optimisticky nastavíme i statusColor, pokud máme kandidáta s href
      if (patchSpec.statusColumnKey) {
        const candidate = statusCandidatesByColumn.get(patchSpec.statusColumnKey)?.[0];

        if (candidate?.href) {
          linkPatch.statusHref = candidate.href;
          optimisticCard = applyLocalPatchToCard(optimisticCard, {
            status: { name: candidate.name, href: candidate.href },
          });

          // ✅ barva: z kandidáta (nebo null)
          optimisticCard = { ...optimisticCard, statusColor: candidate.color ?? null };
        } else {
          // fallback: necháme vyřešit serverem přes mapu sloupec->status
          // barvu v tomhle případě necháme do potvrzení serverem (nebude se měnit optimisticky)
        }
      }

      // swimlane patch
      if (patchSpec.swimline) {
        Object.assign(linkPatch, opValueToLinkPatch(patchSpec.swimline.field, patchSpec.swimline.apiValue));
        optimisticCard = applySwimlineLocalPatch(optimisticCard, patchSpec.swimline.field, target, false);
      }

      if (patchSpec.nestedSwimline) {
        Object.assign(
          linkPatch,
          opValueToLinkPatch(patchSpec.nestedSwimline.field, patchSpec.nestedSwimline.apiValue)
        );
        optimisticCard = applySwimlineLocalPatch(optimisticCard, patchSpec.nestedSwimline.field, target, true);
      }

      // optimistic update
      setItems((current) => current.map((i) => (i.id === card.id ? optimisticCard : i)));

      try {
        const res = await fetch(`/api/work-packages/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lockVersion: card.lockVersion,
            links: linkPatch,
            boardMove: patchSpec.statusColumnKey ? { statusColumnKey: patchSpec.statusColumnKey } : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${res.status}`);
        }

        const updated = await res.json();

        // ✅ finální sync ze serveru (včetně statusColor)
        setItems((current) =>
          current.map((i) =>
            i.id !== card.id
              ? i
              : {
                  ...i,
                  lockVersion: updated.lockVersion ?? i.lockVersion,

                  statusName: updated?._links?.status?.title || i.statusName,
                  statusHref: updated?._links?.status?.href || i.statusHref,
                  statusColor: updated?.statusColor ?? i.statusColor ?? null,

                  assigneeName: updated?._links?.assignee?.title ?? "Nezařazeno",
                  assigneeHref: updated?._links?.assignee?.href ?? null,

                  priorityName: updated?._links?.priority?.title || i.priorityName,
                  priorityHref: updated?._links?.priority?.href || i.priorityHref,

                  typeName: updated?._links?.type?.title || i.typeName,
                  typeHref: updated?._links?.type?.href || i.typeHref,

                  responsibleName: updated?._links?.responsible?.title ?? "Bez responsible",
                  responsibleHref: updated?._links?.responsible?.href ?? null,
                }
          )
        );
      } catch (e) {
        setItems(prevItems);
        alert(e instanceof Error ? e.message : "Změna se nepodařila uložit");
      }
    },
    [items, nestedRowGroupBy, rowGroupBy, statusCandidatesByColumn]
  );

  return {
    selectedId,
    setSelectedId,
    boardSettingsOpen,
    setBoardSettingsOpen,
    rowGroupBy,
    setRowGroupBy,
    nestedRowGroupBy,
    setNestedRowGroupBy,
    filters,
    setFilters,
    updateFilter,
    setQuickSearch,
    extraColumns,
    setExtraColumns,
    extraCardFields,
    setExtraCardFields,

    distinctValues,
    filteredItems,
    visibleColumns,
    rows,
    nestedEnabled,
    primaryLaneCounts,
    visibleCardFields,
    hasCards,
    itemsCount: items.length,

    replaceUrl,
    clearAll,
    copyShareLink,
    countInColumn,
    onDropCard,
  };
}