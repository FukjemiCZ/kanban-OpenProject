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

  lockVersion?: number;

  statusName: string;
  statusHref?: string;

  priorityName?: string;
  priorityHref?: string;

  assigneeName?: string;
  assigneeHref?: string | null;

  projectName?: string;
  projectIdentifier?: string;
  projectHref?: string;

  typeName?: string;
  typeHref?: string;

  authorName?: string;
  authorHref?: string;

  responsibleName?: string;
  responsibleHref?: string | null;
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
  laneApiValue?: string | null;

  nestedKey?: string;
  nestedLabel?: string;
  nestedApiValue?: string | null;

  cellsByColumn: Record<BoardColumnKey, WorkPackage[]>;
  total: number;
};

export type BoardColumnDef = {
  key: BoardColumnKey;
  label: string;
  aliases: string[];
  isDefault: boolean;
};

export type BoardDropTarget = {
  columnKey: BoardColumnKey;
  laneKey: string;
  laneLabel: string;
  laneApiValue?: string | null;
  nestedKey?: string;
  nestedLabel?: string;
  nestedApiValue?: string | null;
};

export type DragCardPayload = {
  cardId: number;
  fromColumnKey: BoardColumnKey;
  fromLaneKey: string;
  fromNestedKey?: string;
};