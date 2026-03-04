import type { BoardColumnDef, CardFieldKey, FiltersState, GroupField } from "./kanban.types";

export const GROUP_OPTIONS: Array<{ value: GroupField; label: string }> = [
  { value: "none", label: "Bez řádků" },
  { value: "priorityName", label: "Priorita" },
  { value: "assigneeName", label: "Assignee" },
  { value: "projectName", label: "Projekt" },
  { value: "typeName", label: "Typ" },
  { value: "authorName", label: "Author" },
  { value: "responsibleName", label: "Responsible" },
];

export const FILTER_FIELDS: Array<{ key: keyof Omit<FiltersState, "q">; label: string }> = [
  { key: "statusName", label: "Status" },
  { key: "priorityName", label: "Priorita" },
  { key: "assigneeName", label: "Assignee" },
  { key: "projectName", label: "Projekt" },
  { key: "typeName", label: "Typ" },
  { key: "authorName", label: "Author" },
  { key: "responsibleName", label: "Responsible" },
];

export const DEFAULT_CARD_FIELDS: CardFieldKey[] = ["projectName", "assigneeName"];

export const OPTIONAL_CARD_FIELDS: Array<{ key: CardFieldKey; label: string }> = [
  { key: "priorityName", label: "Priorita" },
  { key: "typeName", label: "Typ" },
  { key: "authorName", label: "Author" },
  { key: "responsibleName", label: "Responsible" },
];

export const BOARD_COLUMNS: BoardColumnDef[] = [
  {
    key: "new",
    label: "New",
    aliases: ["new", "novy", "nový", "todo", "to do", "open"],
    isDefault: true,
    ui: "drawer",
  },
  {
    key: "backlog",
    label: "Backlog",
    aliases: ["backlog"],
    isDefault: true,
    ui: "drawer",
  },
  {
    key: "ready",
    label: "Ready",
    aliases: ["ready"],
    isDefault: true,
  },
  {
    key: "in_progress",
    label: "In Progress",
    aliases: ["in progress", "in-progress", "progress", "probíhá", "probiha", "doing"],
    isDefault: true,
  },
  {
    key: "blocker",
    label: "Blocked",
    aliases: ["blocked", "blocker", "on hold", "hold", "blokováno", "blokovano"],
    isDefault: true,
    ui: "drawer",
  },
  {
    key: "review",
    label: "Review",
    aliases: ["review", "code review", "in review"],
    isDefault: false,
  },
  {
    key: "qa",
    label: "QA",
    aliases: ["qa", "test", "testing", "in test", "ready for test"],
    isDefault: false,
  },
  {
    key: "waiting_customer",
    label: "Waiting Customer",
    aliases: ["waiting customer", "customer feedback", "waiting for customer", "pending customer"],
    isDefault: false,
  },
  {
    key: "done",
    label: "Done",
    aliases: ["done", "closed", "resolved", "complete", "completed", "hotovo", "uzavřen", "uzavren"],
    isDefault: true,
  },
  {
    key: "rejected",
    label: "Rejected",
    aliases: ["rejected"],
    isDefault: true,
  },
  {
    key: "other",
    label: "Other",
    aliases: [],
    isDefault: false,
  },
];

export const DEFAULT_COLUMN_KEYS = BOARD_COLUMNS.filter((c) => c.isDefault).map((c) => c.key);
export const OPTIONAL_COLUMN_KEYS = BOARD_COLUMNS.filter((c) => !c.isDefault).map((c) => c.key);

export const DRAWER_COLUMN_KEYS = BOARD_COLUMNS.filter((c) => c.ui === "drawer").map((c) => c.key);

// Layout
export const COLUMN_WIDTH = 320;
export const LANE_WIDTH = 240;
export const NESTED_LANE_WIDTH = 220;

/**
 * Skutečná šířka panelu (drawer zleva).
 */
export const POOL_DRAWER_WIDTH = {
  xs: "88vw",
  sm: 420,
} as const;

/**
 * Kolik “rezervovat” v layoutu (dock spacer) aby drawer NEPŘEKRÝVAL první sloupec.
 * Na mobilu nedockujeme (0), na sm+ dockujeme 420px.
 */
export const POOL_DRAWER_DOCK_WIDTH = {
  xs: 0,
  sm: 420,
} as const;

export const POOL_DRAWER_TRANSITION = "width 220ms cubic-bezier(0.4, 0, 0.2, 1)";