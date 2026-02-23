import {
  BOARD_COLUMNS,
  DEFAULT_COLUMN_KEYS,
  GROUP_OPTIONS,
  OPTIONAL_CARD_FIELDS,
  OPTIONAL_COLUMN_KEYS,
} from "./kanban.constants";
import type {
  BoardColumnKey,
  CardFieldKey,
  FiltersState,
  GroupField,
  LaneRow,
  WorkPackage,
} from "./kanban.types";

export function getFieldLabel(field: GroupField) {
  return GROUP_OPTIONS.find((o) => o.value === field)?.label ?? field;
}

export function normalizeValue(v?: string) {
  const s = (v || "").trim();
  return s || "—";
}

export function sortGroupKeys(keys: string[]) {
  return [...keys].sort((a, b) => a.localeCompare(b, "cs"));
}

export function getGroupValue(item: WorkPackage, field: GroupField): string {
  if (field === "none") return "Vše";
  return normalizeValue(item[field]);
}

export function getGroupApiValue(item: WorkPackage, field: GroupField): string | null | undefined {
  switch (field) {
    case "none":
      return undefined;
    case "assigneeName":
      return item.assigneeHref ?? null;
    case "priorityName":
      return item.priorityHref;
    case "typeName":
      return item.typeHref;
    case "responsibleName":
      return item.responsibleHref ?? null;
    case "projectName":
      return item.projectHref;
    case "authorName":
      return item.authorHref;
    default:
      return undefined;
  }
}

export function buildDistinctValues(items: WorkPackage[]) {
  const out: Record<Exclude<GroupField, "none"> | "statusName", string[]> = {
    statusName: [],
    priorityName: [],
    assigneeName: [],
    projectName: [],
    typeName: [],
    authorName: [],
    responsibleName: [],
  };

  const sets: Record<Exclude<GroupField, "none"> | "statusName", Set<string>> = {
    statusName: new Set(),
    priorityName: new Set(),
    assigneeName: new Set(),
    projectName: new Set(),
    typeName: new Set(),
    authorName: new Set(),
    responsibleName: new Set(),
  };

  for (const item of items) {
    sets.statusName.add(normalizeValue(item.statusName));
    sets.priorityName.add(normalizeValue(item.priorityName));
    sets.assigneeName.add(normalizeValue(item.assigneeName));
    sets.projectName.add(normalizeValue(item.projectName));
    sets.typeName.add(normalizeValue(item.typeName));
    sets.authorName.add(normalizeValue(item.authorName));
    sets.responsibleName.add(normalizeValue(item.responsibleName));
  }

  for (const key of Object.keys(sets) as Array<keyof typeof sets>) {
    out[key] = sortGroupKeys(Array.from(sets[key]));
  }

  return out;
}

function matchesMulti(values: string[], candidate?: string) {
  if (!values.length) return true;
  return values.includes(normalizeValue(candidate));
}

export function applyFilters(items: WorkPackage[], filters: FiltersState): WorkPackage[] {
  const q = filters.q.trim().toLowerCase();

  return items.filter((item) => {
    if (q) {
      const haystack = [
        String(item.id),
        item.subject || "",
        item.statusName || "",
        item.priorityName || "",
        item.assigneeName || "",
        item.projectName || "",
        item.typeName || "",
        item.authorName || "",
        item.responsibleName || "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    if (!matchesMulti(filters.statusName, item.statusName)) return false;
    if (!matchesMulti(filters.priorityName, item.priorityName)) return false;
    if (!matchesMulti(filters.assigneeName, item.assigneeName)) return false;
    if (!matchesMulti(filters.projectName, item.projectName)) return false;
    if (!matchesMulti(filters.typeName, item.typeName)) return false;
    if (!matchesMulti(filters.authorName, item.authorName)) return false;
    if (!matchesMulti(filters.responsibleName, item.responsibleName)) return false;

    return true;
  });
}

function normalizeStatusForMatch(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapStatusToColumnKey(statusName: string): BoardColumnKey {
  const s = normalizeStatusForMatch(statusName);

  for (const col of BOARD_COLUMNS) {
    if (col.key === "other") continue;
    if (col.aliases.some((a) => normalizeStatusForMatch(a) === s)) return col.key;
  }

  return "other";
}

export function getColumnLabel(columnKey: BoardColumnKey) {
  return BOARD_COLUMNS.find((c) => c.key === columnKey)?.label ?? columnKey;
}

export function parseMultiParam(sp: URLSearchParams, key: string): string[] {
  const repeated = sp.getAll(key).flatMap((v) => v.split(","));
  return Array.from(new Set(repeated.map((v) => v.trim()).filter(Boolean)));
}

export function setMultiParam(params: URLSearchParams, key: string, values: string[]) {
  params.delete(key);
  for (const value of values) params.append(key, value);
}

export function parseColsParam(sp: URLSearchParams): BoardColumnKey[] {
  const raw = (sp.get("cols") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = new Set(OPTIONAL_COLUMN_KEYS);
  return Array.from(new Set(raw)).filter((v): v is BoardColumnKey =>
    allowed.has(v as BoardColumnKey)
  );
}

export function parseFieldsParam(sp: URLSearchParams): CardFieldKey[] {
  const raw = (sp.get("fields") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = new Set(OPTIONAL_CARD_FIELDS.map((f) => f.key));
  return Array.from(new Set(raw)).filter((v): v is CardFieldKey =>
    allowed.has(v as CardFieldKey)
  );
}

export function parseUrlState(sp: URLSearchParams) {
  const rows = (sp.get("rows") || "none") as GroupField;
  const nested = (sp.get("nested") || "none") as GroupField;

  return {
    rows,
    nested,
    extraColumns: parseColsParam(sp),
    extraCardFields: parseFieldsParam(sp),
    filters: {
      q: "",
      statusName: parseMultiParam(sp, "status"),
      priorityName: parseMultiParam(sp, "priority"),
      assigneeName: parseMultiParam(sp, "assignee"),
      projectName: parseMultiParam(sp, "project"),
      typeName: parseMultiParam(sp, "type"),
      authorName: parseMultiParam(sp, "author"),
      responsibleName: parseMultiParam(sp, "responsible"),
    } as FiltersState,
  };
}

function dedupeColumns(cols: BoardColumnKey[]) {
  return cols.filter((c, i) => cols.indexOf(c) === i);
}

export function buildEffectiveVisibleColumns(
  userExtraColumns: BoardColumnKey[],
  filteredItems: WorkPackage[]
): BoardColumnKey[] {
  const detected = filteredItems
    .map((i) => mapStatusToColumnKey(i.statusName))
    .filter((c) => c !== "other");

  return dedupeColumns([
    ...DEFAULT_COLUMN_KEYS,
    ...detected,
    ...userExtraColumns.filter((c) => OPTIONAL_COLUMN_KEYS.includes(c)),
  ]);
}

function createEmptyCellsByColumn(visibleColumns: BoardColumnKey[]) {
  const entries = visibleColumns.map((k) => [k, [] as WorkPackage[]]);
  return Object.fromEntries(entries) as Record<BoardColumnKey, WorkPackage[]>;
}

export function buildRows(params: {
  items: WorkPackage[];
  visibleColumns: BoardColumnKey[];
  rowGroupBy: GroupField;
  nestedRowGroupBy: GroupField;
}): LaneRow[] {
  const { items, visibleColumns, rowGroupBy, nestedRowGroupBy } = params;
  const rows: LaneRow[] = [];

  const nestedEnabled =
    rowGroupBy !== "none" && nestedRowGroupBy !== "none" && rowGroupBy !== nestedRowGroupBy;

  const pushItemsToCells = (targetItems: WorkPackage[]) => {
    const cellsByColumn = createEmptyCellsByColumn(visibleColumns);

    for (const item of targetItems) {
      const mapped = mapStatusToColumnKey(item.statusName);
      const targetCol = visibleColumns.includes(mapped) ? mapped : "other";
      if (!cellsByColumn[targetCol]) cellsByColumn[targetCol] = [];
      cellsByColumn[targetCol].push(item);
    }

    const total = visibleColumns.reduce((acc, c) => acc + (cellsByColumn[c]?.length ?? 0), 0);
    return { cellsByColumn, total };
  };

  if (rowGroupBy === "none") {
    const packed = pushItemsToCells(items);
    rows.push({
      laneKey: "all",
      laneLabel: "Vše",
      laneApiValue: undefined,
      cellsByColumn: packed.cellsByColumn,
      total: packed.total,
    });
    return rows;
  }

  const primaryMap = new Map<string, WorkPackage[]>();

  for (const item of items) {
    const key = getGroupValue(item, rowGroupBy);
    if (!primaryMap.has(key)) primaryMap.set(key, []);
    primaryMap.get(key)!.push(item);
  }

  const primaryKeys = sortGroupKeys(Array.from(primaryMap.keys()));

  for (const pk of primaryKeys) {
    const primaryItems = primaryMap.get(pk) ?? [];
    const laneApiValue = primaryItems[0] ? getGroupApiValue(primaryItems[0], rowGroupBy) : undefined;

    if (!nestedEnabled) {
      const packed = pushItemsToCells(primaryItems);
      rows.push({
        laneKey: pk,
        laneLabel: pk,
        laneApiValue,
        cellsByColumn: packed.cellsByColumn,
        total: packed.total,
      });
      continue;
    }

    const secondaryMap = new Map<string, WorkPackage[]>();

    for (const item of primaryItems) {
      const sk = getGroupValue(item, nestedRowGroupBy);
      if (!secondaryMap.has(sk)) secondaryMap.set(sk, []);
      secondaryMap.get(sk)!.push(item);
    }

    const secondaryKeys = sortGroupKeys(Array.from(secondaryMap.keys()));

    for (const sk of secondaryKeys) {
      const secondaryItems = secondaryMap.get(sk) ?? [];
      const nestedApiValue = secondaryItems[0]
        ? getGroupApiValue(secondaryItems[0], nestedRowGroupBy)
        : undefined;

      const packed = pushItemsToCells(secondaryItems);
      rows.push({
        laneKey: pk,
        laneLabel: pk,
        laneApiValue,
        nestedKey: sk,
        nestedLabel: sk,
        nestedApiValue,
        cellsByColumn: packed.cellsByColumn,
        total: packed.total,
      });
    }
  }

  return rows;
}

export function countCardsInColumn(rows: LaneRow[], columnKey: BoardColumnKey) {
  return rows.reduce((acc, row) => acc + (row.cellsByColumn[columnKey]?.length ?? 0), 0);
}

export function hasAnyVisibleCards(rows: LaneRow[], visibleColumns: BoardColumnKey[]) {
  return rows.some((r) => visibleColumns.some((c) => (r.cellsByColumn[c]?.length ?? 0) > 0));
}

export const EMPTY_FILTERS: FiltersState = {
  q: "",
  statusName: [],
  priorityName: [],
  assigneeName: [],
  projectName: [],
  typeName: [],
  authorName: [],
  responsibleName: [],
};

export function canEditSwimlineField(field: GroupField) {
  return (
    field === "assigneeName" ||
    field === "priorityName" ||
    field === "typeName" ||
    field === "responsibleName"
  );
}

export type BoardUpdatePatch = {
  statusColumnKey?: BoardColumnKey;
  swimline?: {
    field: GroupField;
    apiValue: string | null | undefined;
    label: string;
  };
  nestedSwimline?: {
    field: Exclude<GroupField, "none">;
    apiValue: string | null | undefined;
    label: string;
  };
};

export function buildPatchFromBoardDrop(params: {
  card: WorkPackage;
  fromColumnKey: BoardColumnKey;
  toColumnKey: BoardColumnKey;
  fromLaneKey: string;
  toLaneKey: string;
  fromNestedKey?: string;
  toNestedKey?: string;
  rowGroupBy: GroupField;
  nestedRowGroupBy: GroupField;
  toLaneApiValue?: string | null;
  toNestedApiValue?: string | null;
  toLaneLabel: string;
  toNestedLabel?: string;
}): BoardUpdatePatch {
  const {
    fromColumnKey,
    toColumnKey,
    fromLaneKey,
    toLaneKey,
    fromNestedKey,
    toNestedKey,
    rowGroupBy,
    nestedRowGroupBy,
    toLaneApiValue,
    toNestedApiValue,
    toLaneLabel,
    toNestedLabel,
  } = params;

  const patch: BoardUpdatePatch = {};

  if (fromColumnKey !== toColumnKey) {
    patch.statusColumnKey = toColumnKey;
  }

  if (rowGroupBy !== "none" && fromLaneKey !== toLaneKey && canEditSwimlineField(rowGroupBy)) {
    patch.swimline = {
      field: rowGroupBy,
      apiValue: toLaneApiValue,
      label: toLaneLabel,
    };
  }

  const nestedEnabled =
    rowGroupBy !== "none" && nestedRowGroupBy !== "none" && rowGroupBy !== nestedRowGroupBy;

  if (
    nestedEnabled &&
    fromNestedKey !== toNestedKey &&
    canEditSwimlineField(nestedRowGroupBy)
  ) {
    patch.nestedSwimline = {
      field: nestedRowGroupBy,
      apiValue: toNestedApiValue,
      label: toNestedLabel ?? "—",
    };
  }

  return patch;
}