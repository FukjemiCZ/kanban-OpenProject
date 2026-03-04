"use client";

import { useEffect, useMemo, useState } from "react";

import BlockIcon from "@mui/icons-material/Block";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import { Badge, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";

import { BoardSettingsDrawer } from "../BoardSettingsDrawer";
import { WorkPackageDetailDrawer } from "../WorkPackageDetailDrawer";

import { KanbanGrid } from "./KanbanGrid";
import { KanbanTopBar } from "./KanbanTopBar";
import { StatusPoolDrawer } from "./StatusPoolDrawer";

import {
  BOARD_COLUMNS,
  DEFAULT_CARD_FIELDS,
  DEFAULT_COLUMN_KEYS,
  DRAWER_COLUMN_KEYS,
  FILTER_FIELDS,
  GROUP_OPTIONS,
  OPTIONAL_CARD_FIELDS,
  OPTIONAL_COLUMN_KEYS,
  POOL_DRAWER_DOCK_WIDTH,
  POOL_DRAWER_TRANSITION,
} from "./kanban.constants";
import type { BoardColumnKey, Me, WorkPackage } from "./kanban.types";
import { getColumnLabel, getFieldLabel } from "./kanban.utils";
import { useKanbanBoardState } from "./useKanbanBoardState";

function iconForDrawerColumn(key: BoardColumnKey) {
  switch (key) {
    case "backlog":
      return <FormatListBulletedIcon fontSize="small" />;
    case "new":
      return <FiberNewIcon fontSize="small" />;
    case "blocker":
      return <BlockIcon fontSize="small" />;
    default:
      return <FormatListBulletedIcon fontSize="small" />;
  }
}

export function KanbanBoard({
  initialItems,
  initialMe,
}: {
  initialItems: WorkPackage[];
  initialMe?: Me;
}) {
  const state = useKanbanBoardState(initialItems);

  const [poolKey, setPoolKey] = useState<BoardColumnKey | null>(null);

  // Drawer sloupce (config v constants) + respektuje viditelné sloupce v settings
  const drawerColumnsActive = useMemo(() => {
    return DRAWER_COLUMN_KEYS.filter((k) => state.visibleColumns.includes(k));
  }, [state.visibleColumns]);

  // Grid sloupce = viditelné sloupce minus drawer sloupce
  const gridColumns = useMemo(() => {
    return state.visibleColumns.filter((c) => !drawerColumnsActive.includes(c));
  }, [state.visibleColumns, drawerColumnsActive]);

  // Pokud uživatel v settings vypne otevřený drawer sloupec, drawer zavři
  useEffect(() => {
    if (poolKey && !drawerColumnsActive.includes(poolKey)) setPoolKey(null);
  }, [poolKey, drawerColumnsActive]);

  const poolCards = useMemo(() => {
    if (!poolKey) return [];
    const out: Array<{ card: WorkPackage; laneKey: string; nestedKey?: string }> = [];
    for (const row of state.rows) {
      const cards = row.cellsByColumn[poolKey] ?? [];
      for (const card of cards) out.push({ card, laneKey: row.laneKey, nestedKey: row.nestedKey });
    }
    return out;
  }, [poolKey, state.rows]);

  const poolSubtitle = useMemo(() => {
    if (!poolKey) return undefined;
    const def = BOARD_COLUMNS.find((c) => c.key === poolKey);
    return def?.label ? `Pool: ${def.label}` : "Pool";
  }, [poolKey]);

  return (
    <>
      <KanbanTopBar
        q={state.filters.q}
        onQChange={state.setQuickSearch}
        rowGroupBy={state.rowGroupBy}
        nestedRowGroupBy={state.nestedRowGroupBy}
        nestedEnabled={state.nestedEnabled}
        visibleColumnsCount={gridColumns.length}
        filteredCount={state.filteredItems.length}
        getFieldLabel={getFieldLabel}
        onOpenSettings={() => state.setBoardSettingsOpen(true)}
        onCopyShareLink={() => void state.copyShareLink()}
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
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 1,
              alignItems: "stretch",
            }}
          >
            {/* Left rail buttons (drawer columns) */}
            {drawerColumnsActive.length ? (
              <Box
                sx={{
                  flex: "0 0 auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  p: 0.75,
                  alignSelf: { md: "flex-start" },
                  position: { md: "sticky" },
                  top: { md: 12 },
                }}
              >
                <Stack direction={{ xs: "row", md: "column" }} spacing={0.5}>
                  {drawerColumnsActive.map((k) => {
                    const label = getColumnLabel(k);
                    const count = state.countInColumn(k);
                    const active = poolKey === k;

                    return (
                      <Tooltip key={k} title={`${label} (${count})`} placement="right">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => setPoolKey((prev) => (prev === k ? null : k))}
                            aria-label={`Open pool ${label}`}
                            sx={{
                              border: "1px solid",
                              borderColor: active ? "primary.main" : "divider",
                              borderRadius: 2,
                            }}
                          >
                            <Badge badgeContent={count} color="primary" overlap="circular" max={999}>
                              {iconForDrawerColumn(k)}
                            </Badge>
                          </IconButton>
                        </span>
                      </Tooltip>
                    );
                  })}
                </Stack>
              </Box>
            ) : null}

            {/* Grid region (DOCK via spacer, not margin-left) */}
            <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
              {/* ✅ Spacer rezervuje místo pro fixed drawer -> první sloupec zůstane droppable */}
              <Box
                sx={{
                  display: { xs: "none", sm: "block" },
                  flex: "0 0 auto",
                  width: poolKey ? POOL_DRAWER_DOCK_WIDTH : 0,
                  transition: POOL_DRAWER_TRANSITION,
                }}
              />

              {/* Actual grid */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {gridColumns.length === 0 ? (
                  <Box
                    sx={{
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                    }}
                  >
                    <Typography fontWeight={700}>V gridu nejsou žádné sloupce</Typography>
                    <Typography variant="body2" color="text.secondary">
                      V nastavení boardu máš pravděpodobně zapnuté jen sloupce typu drawer.
                    </Typography>
                  </Box>
                ) : (
                  <KanbanGrid
                    rows={state.rows}
                    visibleColumns={gridColumns}
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
            </Box>
          </Box>
        )}
      </Box>

      {/* Pool drawer */}
      {poolKey ? (
        <StatusPoolDrawer
          open={poolKey != null}
          columnKey={poolKey}
          title={`${getColumnLabel(poolKey)} (${state.countInColumn(poolKey)})`}
          subtitle={poolSubtitle}
          rows={state.rows}
          cards={poolCards}
          visibleCardFields={state.visibleCardFields}
          onOpenCard={state.setSelectedId}
          onClose={() => setPoolKey(null)}
          onCardDrop={state.onDropCard}
        />
      ) : null}

      <BoardSettingsDrawer
        open={state.boardSettingsOpen}
        onClose={() => state.setBoardSettingsOpen(false)}
        hiddenByColumnSelectionCount={0}
        filteredCount={state.filteredItems.length}
        onCopyShareLink={() => void state.copyShareLink()}
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