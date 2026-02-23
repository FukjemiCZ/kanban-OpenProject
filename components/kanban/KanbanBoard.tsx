"use client";

import { Box, Typography } from "@mui/material";
import { BoardSettingsDrawer } from "../BoardSettingsDrawer";
import { WorkPackageDetailDrawer } from "../WorkPackageDetailDrawer";
import { KanbanGrid } from "./KanbanGrid";
import { KanbanTopBar } from "./KanbanTopBar";
import {
  DEFAULT_CARD_FIELDS,
  DEFAULT_COLUMN_KEYS,
  FILTER_FIELDS,
  GROUP_OPTIONS,
  OPTIONAL_CARD_FIELDS,
  OPTIONAL_COLUMN_KEYS,
} from "./kanban.constants";
import type { Me, WorkPackage } from "./kanban.types";
import { getColumnLabel, getFieldLabel } from "./kanban.utils";
import { useKanbanBoardState } from "./useKanbanBoardState";

export function KanbanBoard({
  initialItems,
  initialMe,
}: {
  initialItems: WorkPackage[];
  initialMe?: Me;
}) {
  const state = useKanbanBoardState(initialItems);

  return (
    <>
      <KanbanTopBar
        q={state.filters.q}
        onQChange={state.setQuickSearch}
        rowGroupBy={state.rowGroupBy}
        nestedRowGroupBy={state.nestedRowGroupBy}
        nestedEnabled={state.nestedEnabled}
        visibleColumnsCount={state.visibleColumns.length}
        filteredCount={state.filteredItems.length}
        getFieldLabel={getFieldLabel}
        onOpenSettings={() => state.setBoardSettingsOpen(true)}
        onCopyShareLink={() => {
          void state.copyShareLink();
        }}
      />

      <Box sx={{ px: { xs: 1, md: 2 }, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Přihlášen: {initialMe?.name ?? "?"}
        </Typography>

        {!state.hasCards ? (
          <Box
            sx={{
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              p: 3,
              textAlign: "center",
            }}
          >
            <Typography fontWeight={700}>Žádné tasky neodpovídají pohledu</Typography>
            <Typography variant="body2" color="text.secondary">
              Zkus upravit vyhledávání nebo otevři nastavení boardu a změň filtry.
            </Typography>
          </Box>
        ) : (
          <KanbanGrid
            rows={state.rows}
            visibleColumns={state.visibleColumns}
            rowGroupBy={state.rowGroupBy}
            nestedRowGroupBy={state.nestedRowGroupBy}
            nestedEnabled={state.nestedEnabled}
            primaryLaneCounts={state.primaryLaneCounts}
            getFieldLabel={getFieldLabel}
            getColumnLabel={getColumnLabel}
            countInColumn={state.countInColumn}
            onOpenCard={state.setSelectedId}
            visibleCardFields={state.visibleCardFields}
            onCardDrop={state.onDropCard}
          />
        )}
      </Box>

      <BoardSettingsDrawer
        open={state.boardSettingsOpen}
        onClose={() => state.setBoardSettingsOpen(false)}
        hiddenByColumnSelectionCount={0}
        filteredCount={state.filteredItems.length}
        onCopyShareLink={() => {
          void state.copyShareLink();
        }}
        onClearAll={state.clearAll}
        rowGroupBy={state.rowGroupBy}
        nestedRowGroupBy={state.nestedRowGroupBy}
        setRowGroupBy={state.setRowGroupBy}
        setNestedRowGroupBy={state.setNestedRowGroupBy}
        replaceUrl={state.replaceUrl}
        filters={state.filters}
        updateFilter={state.updateFilter}
        distinctValues={state.distinctValues}
        DEFAULT_COLUMN_KEYS={DEFAULT_COLUMN_KEYS}
        OPTIONAL_COLUMN_KEYS={OPTIONAL_COLUMN_KEYS}
        extraColumns={state.extraColumns}
        setExtraColumns={state.setExtraColumns}
        getColumnLabel={getColumnLabel}
        visibleColumns={state.visibleColumns}
        DEFAULT_CARD_FIELDS={DEFAULT_CARD_FIELDS}
        OPTIONAL_CARD_FIELDS={OPTIONAL_CARD_FIELDS}
        extraCardFields={state.extraCardFields}
        setExtraCardFields={state.setExtraCardFields}
        GROUP_OPTIONS={GROUP_OPTIONS}
        FILTER_FIELDS={FILTER_FIELDS}
        getFieldLabel={getFieldLabel}
      />

      <WorkPackageDetailDrawer
        workPackageId={state.selectedId}
        open={state.selectedId != null}
        onClose={() => state.setSelectedId(null)}
      />
    </>
  );
}