"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Box, Chip, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import type { GroupField } from "./kanban.types";

export function KanbanTopBar({
  q,
  onQChange,
  rowGroupBy,
  nestedRowGroupBy,
  nestedEnabled,
  visibleColumnsCount,
  filteredCount,
  getFieldLabel,
  onOpenSettings,
  onCopyShareLink,
}: {
  q: string;
  onQChange: (v: string) => void;
  rowGroupBy: GroupField;
  nestedRowGroupBy: GroupField;
  nestedEnabled: boolean;
  visibleColumnsCount: number;
  filteredCount: number;
  getFieldLabel: (f: GroupField) => string;
  onOpenSettings: () => void;
  onCopyShareLink: () => void;
}) {
  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", lg: "center" }}
      >
        <TextField
          size="small"
          label="Vyhledávání ticketu"
          placeholder="ID, subject, project, assignee…"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          sx={{ minWidth: { xs: "100%", lg: 380 } }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
          }}
        />

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexGrow: 1 }}>
          <Chip label="Sloupce: Status (fixed)" color="primary" variant="outlined" />
          <Chip label={`Řádky: ${getFieldLabel(rowGroupBy)}`} variant="outlined" />
          {nestedEnabled ? (
            <Chip label={`Vnoření: ${getFieldLabel(nestedRowGroupBy)}`} variant="outlined" />
          ) : null}
          <Chip
            icon={<ViewColumnIcon />}
            label={`Visible columns: ${visibleColumnsCount}`}
            variant="outlined"
          />
          <Chip label={`Tasků po filtrech: ${filteredCount}`} variant="outlined" />
        </Stack>

        <Tooltip title="Nastavení boardu">
          <IconButton onClick={onOpenSettings}>
            <TuneIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Kopírovat sdílitelný odkaz">
          <IconButton onClick={onCopyShareLink}>
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}