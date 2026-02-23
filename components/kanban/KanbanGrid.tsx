"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import { KanbanCard } from "./KanbanCard";
import type {
  BoardColumnKey,
  BoardDropTarget,
  CardFieldKey,
  DragCardPayload,
  GroupField,
  LaneRow,
} from "./kanban.types";

const SWIMLANE_COL_WIDTH = 44;
const NESTED_SWIMLANE_COL_WIDTH = 40;

export function KanbanGrid({
  rows,
  visibleColumns,
  rowGroupBy,
  nestedRowGroupBy,
  nestedEnabled,
  primaryLaneCounts,
  getFieldLabel,
  getColumnLabel,
  countInColumn,
  onOpenCard,
  visibleCardFields,
  onCardDrop,
}: {
  rows: LaneRow[];
  visibleColumns: BoardColumnKey[];
  rowGroupBy: GroupField;
  nestedRowGroupBy: GroupField;
  nestedEnabled: boolean;
  primaryLaneCounts: Map<string, number>;
  getFieldLabel: (f: GroupField) => string;
  getColumnLabel: (c: BoardColumnKey) => string;
  countInColumn: (c: BoardColumnKey) => number;
  onOpenCard: (id: number) => void;
  visibleCardFields: CardFieldKey[];
  onCardDrop?: (drag: DragCardPayload, target: BoardDropTarget) => void;
}) {
  // Status sloupce: bez horizontálního scrollu -> minmax(0, 1fr)
  const statusColumnsTemplate = `repeat(${visibleColumns.length}, minmax(0, 1fr))`;

  const gridTemplateColumns = nestedEnabled
    ? `${SWIMLANE_COL_WIDTH}px ${NESTED_SWIMLANE_COL_WIDTH}px ${statusColumnsTemplate}`
    : rowGroupBy === "none"
    ? statusColumnsTemplate
    : `${SWIMLANE_COL_WIDTH}px ${statusColumnsTemplate}`;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflowX: "hidden",
        overflowY: "auto",
        bgcolor: "background.paper",
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns,
          position: "sticky",
          top: 0,
          zIndex: 2,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {rowGroupBy !== "none" ? (
          <Box
            sx={{
              p: 0.5,
              borderRight: "1px solid",
              borderColor: "divider",
              width: SWIMLANE_COL_WIDTH,
              minWidth: SWIMLANE_COL_WIDTH,
              maxWidth: SWIMLANE_COL_WIDTH,
              minHeight: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                textAlign: "center",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {getFieldLabel(rowGroupBy)}
            </Typography>
          </Box>
        ) : null}

        {nestedEnabled ? (
          <Box
            sx={{
              p: 0.5,
              borderRight: "1px solid",
              borderColor: "divider",
              width: NESTED_SWIMLANE_COL_WIDTH,
              minWidth: NESTED_SWIMLANE_COL_WIDTH,
              maxWidth: NESTED_SWIMLANE_COL_WIDTH,
              minHeight: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                textAlign: "center",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {getFieldLabel(nestedRowGroupBy)}
            </Typography>
          </Box>
        ) : null}

        {visibleColumns.map((columnKey) => (
          <Box
            key={columnKey}
            sx={{
              p: 1,
              borderRight: "1px solid",
              borderColor: "divider",
              minWidth: 0, // ✅ umožní ellipsis v dětech
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ minWidth: 0, width: "100%" }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                noWrap
                sx={{
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={getColumnLabel(columnKey)}
              >
                {getColumnLabel(columnKey)}
              </Typography>

              <Chip size="small" label={countInColumn(columnKey)} sx={{ flexShrink: 0 }} />
            </Stack>
          </Box>
        ))}
      </Box>

      {/* BODY */}
      <Box>
        {(() => {
          const renderedPrimaryLane = new Set<string>();

          return rows.map((row, idx) => {
            const isLast = idx === rows.length - 1;
            const showPrimaryCell =
              rowGroupBy !== "none" && (!nestedEnabled || !renderedPrimaryLane.has(row.laneKey));

            if (rowGroupBy !== "none" && nestedEnabled && showPrimaryCell) {
              renderedPrimaryLane.add(row.laneKey);
            }

            return (
              <Box
                key={`${row.laneKey}__${row.nestedKey ?? "none"}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns,
                  borderBottom: isLast ? "none" : "1px solid",
                  borderColor: "divider",
                  alignItems: "stretch",
                }}
              >
                {rowGroupBy !== "none" ? (
                  showPrimaryCell ? (
                    <Box
                      sx={{
                        p: 0.5,
                        borderRight: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                        minHeight: 120,
                        minWidth: 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 0,
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            textAlign: "center",
                            lineHeight: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxHeight: "100%",
                          }}
                          title={row.laneLabel}
                        >
                          {row.laneLabel}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={
                          nestedEnabled
                            ? rows
                                .filter((r) => r.laneKey === row.laneKey)
                                .reduce((a, r) => a + r.total, 0)
                            : row.total
                        }
                        sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
                      />

                      {nestedEnabled ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                          {primaryLaneCounts.get(row.laneKey) ?? 1}
                        </Typography>
                      ) : null}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        borderRight: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                        minWidth: 0,
                      }}
                    />
                  )
                ) : null}

                {nestedEnabled ? (
                  <Box
                    sx={{
                      p: 0.5,
                      borderRight: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                      minHeight: 120,
                      minWidth: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          textAlign: "center",
                          lineHeight: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxHeight: "100%",
                        }}
                        title={row.nestedLabel}
                      >
                        {row.nestedLabel}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={row.total}
                      sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
                    />
                  </Box>
                ) : null}

                {visibleColumns.map((columnKey) => {
                  const cards = row.cellsByColumn[columnKey] ?? [];

                  const target: BoardDropTarget = {
                    columnKey,
                    laneKey: row.laneKey,
                    laneLabel: row.laneLabel,
                    laneApiValue: row.laneApiValue,
                    nestedKey: row.nestedKey,
                    nestedLabel: row.nestedLabel,
                    nestedApiValue: row.nestedApiValue,
                  };

                  return (
                    <Box
                      key={columnKey}
                      onDragOver={(e) => {
                        if (!onCardDrop) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        if (!onCardDrop) return;
                        e.preventDefault();
                        try {
                          const raw = e.dataTransfer.getData("application/json");
                          if (!raw) return;
                          const drag = JSON.parse(raw) as DragCardPayload;
                          onCardDrop(drag, target);
                        } catch {
                          // noop
                        }
                      }}
                      sx={{
                        p: 0.75,
                        borderRight: "1px solid",
                        borderColor: "divider",
                        minHeight: 120,
                        minWidth: 0,
                        overflow: "hidden",
                        bgcolor: cards.length ? "background.paper" : "action.hover",
                      }}
                    >
                      {cards.length === 0 ? (
                        <Box
                          sx={{
                            minHeight: 92,
                            border: "1px dashed",
                            borderColor: "divider",
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "text.secondary",
                            fontSize: 12,
                            bgcolor: "background.default",
                            px: 1,
                            textAlign: "center",
                          }}
                        >
                          Prázdný sloupec
                        </Box>
                      ) : (
                        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                          {cards.map((card) => (
                            <KanbanCard
                              key={card.id}
                              card={card}
                              onOpen={onOpenCard}
                              visibleCardFields={visibleCardFields}
                              draggable
                              dragPayload={{
                                cardId: card.id,
                                fromColumnKey: columnKey,
                                fromLaneKey: row.laneKey,
                                fromNestedKey: row.nestedKey,
                              }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          });
        })()}
      </Box>
    </Box>
  );
}