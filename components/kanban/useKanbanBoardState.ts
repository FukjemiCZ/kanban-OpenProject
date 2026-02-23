"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
    DEFAULT_CARD_FIELDS,
    DEFAULT_COLUMN_KEYS,
    GROUP_OPTIONS,
} from "./kanban.constants";
import type {
    BoardColumnKey,
    CardFieldKey,
    FiltersState,
    GroupField,
    WorkPackage,
} from "./kanban.types";
import {
    EMPTY_FILTERS,
    applyFilters,
    buildDistinctValues,
    buildEffectiveVisibleColumns,
    buildRows,
    countCardsInColumn,
    hasAnyVisibleCards,
    parseUrlState,
    setMultiParam,
} from "./kanban.utils";

export function useKanbanBoardState(initialItems: WorkPackage[]) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);

    const [rowGroupBy, setRowGroupBy] = useState<GroupField>("assigneeName");
    const [nestedRowGroupBy, setNestedRowGroupBy] = useState<GroupField>("none");

    const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
    const [extraColumns, setExtraColumns] = useState<BoardColumnKey[]>([]);
    const [extraCardFields, setExtraCardFields] = useState<CardFieldKey[]>([]);

    // URL -> state (keep q local-only)
    useEffect(() => {
        const parsed = parseUrlState(new URLSearchParams(searchParams.toString()));
        const validGroupValues = new Set(GROUP_OPTIONS.map((g) => g.value));
        const rowsParam = searchParams.get("rows");
        const safeRows =
            rowsParam === null
                ? "assigneeName"
                : validGroupValues.has(parsed.rows)
                    ? parsed.rows
                    : "assigneeName";
        const safeNested = validGroupValues.has(parsed.nested) ? parsed.nested : "none";

        setRowGroupBy(safeRows);
        setNestedRowGroupBy(safeNested === safeRows ? "none" : safeNested);
        setFilters((prev) => ({ ...parsed.filters, q: prev.q }));
        setExtraColumns(parsed.extraColumns);
        setExtraCardFields(parsed.extraCardFields);
    }, [searchParams]);

    const distinctValues = useMemo(() => buildDistinctValues(initialItems), [initialItems]);

    const filteredItems = useMemo(
        () => applyFilters(initialItems, filters),
        [initialItems, filters]
    );

    // No default hiding: add default + detected + user extras
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
        rowGroupBy !== "none" &&
        nestedRowGroupBy !== "none" &&
        rowGroupBy !== nestedRowGroupBy;

    const primaryLaneCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const row of rows) map.set(row.laneKey, (map.get(row.laneKey) ?? 0) + 1);
        return map;
    }, [rows]);

    const visibleCardFields = useMemo<CardFieldKey[]>(
        () => [
            ...DEFAULT_CARD_FIELDS,
            ...extraCardFields.filter((f) => !DEFAULT_CARD_FIELDS.includes(f)),
        ],
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

            // q intentionally NOT in URL
            setMultiParam(params, "status", f.statusName);
            setMultiParam(params, "priority", f.priorityName);
            setMultiParam(params, "assignee", f.assigneeName);
            setMultiParam(params, "project", f.projectName);
            setMultiParam(params, "type", f.typeName);
            setMultiParam(params, "author", f.authorName);
            setMultiParam(params, "responsible", f.responsibleName);

            // Only store extra (optional) columns in URL; defaults are implicit
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

            // q is local-only
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

    return {
        // raw state
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

        // derived
        distinctValues,
        filteredItems,
        visibleColumns,
        rows,
        nestedEnabled,
        primaryLaneCounts,
        visibleCardFields,
        hasCards,

        // actions
        replaceUrl,
        clearAll,
        copyShareLink,
        countInColumn,
    };
}