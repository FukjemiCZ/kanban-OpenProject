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
    aliases: ["new", "New", "novy", "nový", "to do", "Nové", "todo", "open"],
    isDefault: true,
  },
  {
    key: "backlog",
    label: "Backlog",
    aliases: ["backlog", "Backlog"],
    isDefault: true,
  },
  {
    key: "ready",
    label: "Ready",
    aliases: ["ready", "Ready"],
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
    label: "Blocker",
    aliases: ["blocker", "blocked", "on hold", "hold", "blokovano","pozastaven", "blokováno"],
    isDefault: true,
  },
  {
    key: "done",
    label: "Done",
    aliases: ["Done", "done", "closed", "resolved", "complete", "completed", "Uzavřený", "uzavřen", "hotovo"],
    isDefault: true,
  },
  {
    key: "rejected",
    label: "Rejected",
    aliases: ["Rejected", "rejected"],
    isDefault: true,
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
    aliases: ["qa", "test", "testing", "ready for test", "in test"],
    isDefault: false,
  },
  {
    key: "waiting_customer",
    label: "Waiting Customer",
    aliases: ["waiting customer", "customer feedback", "waiting for customer", "pending customer"],
    isDefault: false,
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

// fixed widths (stable layout)
export const COLUMN_WIDTH = 320;
export const LANE_WIDTH = 240;
export const NESTED_LANE_WIDTH = 220;