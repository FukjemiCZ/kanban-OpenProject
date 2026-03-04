"use client";

import CloseIcon from "@mui/icons-material/Close";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

type GroupField =
  | "none"
  | "priorityName"
  | "assigneeName"
  | "projectName"
  | "typeName"
  | "authorName"
  | "responsibleName";

type FiltersState = {
  q: string;
  statusName: string[];
  priorityName: string[];
  assigneeName: string[];
  projectName: string[];
  typeName: string[];
  authorName: string[];
  responsibleName: string[];
};

type CardFieldKey =
  | "projectName"
  | "assigneeName"
  | "priorityName"
  | "typeName"
  | "authorName"
  | "responsibleName";

type BoardColumnKey =
  | "new"
  | "in_progress"
  | "ready"
  | "rejected"
  | "backlog"
  | "blocker"
  | "done"
  | "review"
  | "qa"
  | "waiting_customer"
  | "other";

export function BoardSettingsDrawer(props: {
  open: boolean;
  onClose: () => void;

  // summaries / actions
  hiddenByColumnSelectionCount: number;
  filteredCount: number;
  onCopyShareLink: () => void;
  onClearAll: () => void;

  // grouping
  rowGroupBy: GroupField;
  nestedRowGroupBy: GroupField;
  setRowGroupBy: (v: GroupField) => void;
  setNestedRowGroupBy: (v: GroupField) => void;
  replaceUrl: (next: {
    rowGroupBy?: GroupField;
    nestedRowGroupBy?: GroupField;
    filters?: FiltersState;
    extraColumns?: BoardColumnKey[];
    extraCardFields?: CardFieldKey[];
  }) => void;

  // filters
  filters: FiltersState;
  updateFilter: <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => void;
  distinctValues: Record<keyof Omit<FiltersState, "q">, string[]>;

  // columns
  DEFAULT_COLUMN_KEYS: BoardColumnKey[];
  OPTIONAL_COLUMN_KEYS: BoardColumnKey[];
  extraColumns: BoardColumnKey[];
  setExtraColumns: (v: BoardColumnKey[]) => void;
  getColumnLabel: (k: BoardColumnKey) => string;
  visibleColumns: BoardColumnKey[];

  // card fields
  DEFAULT_CARD_FIELDS: CardFieldKey[];
  OPTIONAL_CARD_FIELDS: Array<{ key: CardFieldKey; label: string }>;
  extraCardFields: CardFieldKey[];
  setExtraCardFields: (v: CardFieldKey[]) => void;

  // labels
  GROUP_OPTIONS: Array<{ value: GroupField; label: string }>;
  FILTER_FIELDS: Array<{ key: keyof Omit<FiltersState, "q">; label: string }>;
  getFieldLabel: (f: GroupField) => string;
}) {
  const {
    open,
    onClose,
    hiddenByColumnSelectionCount,
    filteredCount,
    onCopyShareLink,
    onClearAll,
    rowGroupBy,
    nestedRowGroupBy,
    setRowGroupBy,
    setNestedRowGroupBy,
    replaceUrl,
    filters,
    updateFilter,
    distinctValues,
    DEFAULT_COLUMN_KEYS,
    OPTIONAL_COLUMN_KEYS,
    extraColumns,
    setExtraColumns,
    getColumnLabel,
    visibleColumns,
    DEFAULT_CARD_FIELDS,
    OPTIONAL_CARD_FIELDS,
    extraCardFields,
    setExtraCardFields,
    GROUP_OPTIONS,
    FILTER_FIELDS,
    getFieldLabel,
  } = props;

  const nestedEnabled =
    rowGroupBy !== "none" &&
    nestedRowGroupBy !== "none" &&
    rowGroupBy !== nestedRowGroupBy;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 560, md: 680 },
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Nastavení boardu
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              Filtry, seskupení a zobrazení
            </Typography>
          </Box>

          <Tooltip title="Kopírovat sdílitelný odkaz">
            <IconButton onClick={onCopyShareLink}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Reset filtrů a nastavení">
            <IconButton onClick={onClearAll}>
              <ClearAllIcon />
            </IconButton>
          </Tooltip>

          <IconButton onClick={onClose} title="Zavřít">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
          <Chip label="Sloupce: Status (fixed)" color="primary" variant="outlined" />
          <Chip label={`Řádky: ${getFieldLabel(rowGroupBy)}`} variant="outlined" />
          {nestedEnabled ? (
            <Chip label={`Vnoření: ${getFieldLabel(nestedRowGroupBy)}`} variant="outlined" />
          ) : null}
          <Chip
            icon={<ViewColumnIcon />}
            label={`Visible columns: ${DEFAULT_COLUMN_KEYS.length} + ${extraColumns.length}`}
            variant="outlined"
          />
          <Chip label={`Tasků po filtrech: ${filteredCount}`} variant="outlined" />
          {hiddenByColumnSelectionCount > 0 ? (
            <Chip
              label={`Skryto sloupci: ${hiddenByColumnSelectionCount}`}
              color="warning"
              variant="outlined"
            />
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ p: 2, overflowY: "auto" }}>
        <Stack spacing={2}>
          {/* Grouping */}
          <Box
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
              Seskupení boardu
            </Typography>

            <Stack spacing={1.25}>
              <FormControl size="small" fullWidth>
                <InputLabel id="row-group-label">Řádky (swimlanes)</InputLabel>
                <Select
                  labelId="row-group-label"
                  label="Řádky (swimlanes)"
                  value={rowGroupBy}
                  onChange={(e) => {
                    const next = e.target.value as GroupField;
                    setRowGroupBy(next);

                    let nextNested = nestedRowGroupBy;
                    if (next === "none") nextNested = "none";
                    if (next === nestedRowGroupBy) nextNested = "none";

                    setNestedRowGroupBy(nextNested);
                    replaceUrl({ rowGroupBy: next, nestedRowGroupBy: nextNested });
                  }}
                >
                  {GROUP_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel id="nested-row-group-label">Vnoření řádků</InputLabel>
                <Select
                  labelId="nested-row-group-label"
                  label="Vnoření řádků"
                  value={nestedRowGroupBy}
                  onChange={(e) => {
                    const next = e.target.value as GroupField;
                    setNestedRowGroupBy(next);
                    replaceUrl({ nestedRowGroupBy: next });
                  }}
                  disabled={rowGroupBy === "none"}
                >
                  {GROUP_OPTIONS.map((o) => (
                    <MenuItem
                      key={o.value}
                      value={o.value}
                      disabled={o.value !== "none" && o.value === rowGroupBy}
                    >
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Visible status columns */}
          <Box
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
              Status sloupce (visibleColumns)
            </Typography>

            <FormControl size="small" fullWidth>
              <InputLabel id="extra-cols-label">Další status sloupce</InputLabel>
              <Select
                labelId="extra-cols-label"
                label="Další status sloupce"
                multiple
                value={extraColumns}
                onChange={(e) => {
                  const next = (e.target.value as BoardColumnKey[]).filter((c) =>
                    OPTIONAL_COLUMN_KEYS.includes(c)
                  );
                  setExtraColumns(next);
                  replaceUrl({ extraColumns: next });
                }}
                renderValue={(selected) =>
                  (selected as string[]).length
                    ? `${(selected as string[]).length} navíc`
                    : "Jen defaultní"
                }
              >
                {DEFAULT_COLUMN_KEYS.map((key) => (
                  <MenuItem key={key} value={key} disabled>
                    {getColumnLabel(key)} (pevný)
                  </MenuItem>
                ))}
                {OPTIONAL_COLUMN_KEYS.map((key) => (
                  <MenuItem key={key} value={key}>
                    {getColumnLabel(key)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
              {visibleColumns.map((c) => (
                <Chip
                  key={`col-${c}`}
                  label={`${getColumnLabel(c)}${
                    DEFAULT_COLUMN_KEYS.includes(c) ? " (pevný)" : ""
                  }`}
                  size="small"
                  variant={DEFAULT_COLUMN_KEYS.includes(c) ? "filled" : "outlined"}
                />
              ))}
            </Stack>
          </Box>

          {/* Card display fields */}
          <Box
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
              Zobrazení karet
            </Typography>

            <FormControl size="small" fullWidth>
              <InputLabel id="card-fields-label">Další metadata na kartě</InputLabel>
              <Select
                labelId="card-fields-label"
                label="Další metadata na kartě"
                multiple
                value={extraCardFields}
                onChange={(e) => {
                  const next = e.target.value as CardFieldKey[];
                  setExtraCardFields(next);
                  replaceUrl({ extraCardFields: next });
                }}
                renderValue={(selected) =>
                  (selected as string[]).length
                    ? `${(selected as string[]).length} navíc`
                    : "Jen defaultní"
                }
              >
                {DEFAULT_CARD_FIELDS.map((key) => {
                  const label =
                    OPTIONAL_CARD_FIELDS.find((x) => x.key === key)?.label ??
                    (key === "projectName" ? "Projekt" : key === "assigneeName" ? "Assignee" : key);

                  return (
                    <MenuItem key={key} value={key} disabled>
                      {label} (pevný)
                    </MenuItem>
                  );
                })}

                {OPTIONAL_CARD_FIELDS.map(({ key, label }) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* Filters */}
          <Box
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
              Filtry boardu
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(240px, 1fr))",
                },
                gap: 1.25,
              }}
            >
              {FILTER_FIELDS.map(({ key, label }) => (
                <FormControl key={key} size="small" fullWidth>
                  <InputLabel id={`${key}-filter-label`}>{label}</InputLabel>
                  <Select
                    labelId={`${key}-filter-label`}
                    label={label}
                    multiple
                    value={filters[key]}
                    onChange={(e) => updateFilter(key, e.target.value as string[])}
                    renderValue={(selected) =>
                      (selected as string[]).length
                        ? `${(selected as string[]).length} vybráno`
                        : "Vše"
                    }
                  >
                    {distinctValues[key].map((v) => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
              {FILTER_FIELDS.flatMap(({ key, label }) =>
                filters[key].map((v) => (
                  <Chip
                    key={`${key}:${v}`}
                    label={`${label}: ${v}`}
                    size="small"
                    onDelete={() =>
                      updateFilter(
                        key,
                        filters[key].filter((x) => x !== v)
                      )
                    }
                  />
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  );
}