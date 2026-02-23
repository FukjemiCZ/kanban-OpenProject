export type GroupField =
  | "none"
  | "priorityName"
  | "assigneeName"
  | "projectName"
  | "typeName"
  | "authorName"
  | "responsibleName";

export type WorkPackage = {
  id: number;
  subject: string;
  statusName: string;
  priorityName?: string;
  assigneeName?: string;
  projectName?: string;
  typeName?: string;
  authorName?: string;
  responsibleName?: string;
};

export type Me = { name: string };

export type FiltersState = {
  q: string; // local-only, not in URL
  statusName: string[];
  priorityName: string[];
  assigneeName: string[];
  projectName: string[];
  typeName: string[];
  authorName: string[];
  responsibleName: string[];
};

export type CardFieldKey =
  | "projectName"
  | "assigneeName"
  | "priorityName"
  | "typeName"
  | "authorName"
  | "responsibleName";

export type BoardColumnKey =
  | "new"
  | "in_progress"
  | "blocker"
  | "done"
  | "review"
  | "qa"
  | "waiting_customer"
  | "other";

export type LaneRow = {
  laneKey: string;
  laneLabel: string;
  nestedKey?: string;
  nestedLabel?: string;
  cellsByColumn: Record<BoardColumnKey, WorkPackage[]>;
  total: number;
};

export type BoardColumnDef = {
  key: BoardColumnKey;
  label: string;
  aliases: string[];
  isDefault: boolean;
};