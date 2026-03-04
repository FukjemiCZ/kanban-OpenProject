"use client";

import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  ClickAwayListener,
  Divider,
  IconButton,
  Paper,
  Slide,
  Stack,
  Typography,
} from "@mui/material";

import { KanbanCard } from "./KanbanCard";
import { POOL_DRAWER_WIDTH } from "./kanban.constants";
import type {
  BoardColumnKey,
  BoardDropTarget,
  CardFieldKey,
  DragCardPayload,
  LaneRow,
  WorkPackage,
} from "./kanban.types";

type DrawerCard = {
  card: WorkPackage;
  laneKey: string;
  nestedKey?: string;
};

function sameKey(a?: string, b?: string) {
  return (a ?? "__") === (b ?? "__");
}

function findRow(rows: LaneRow[], laneKey: string, nestedKey?: string) {
  return (
    rows.find((r) => r.laneKey === laneKey && sameKey(r.nestedKey, nestedKey)) ??
    rows.find((r) => r.laneKey === laneKey) ??
    rows.find((r) => r.laneKey === "all") ??
    rows[0]
  );
}

export function StatusPoolDrawer({
  open,
  columnKey,
  title,
  subtitle,
  rows,
  cards,
  visibleCardFields,
  onOpenCard,
  onClose,
  onCardDrop,
}: {
  open: boolean;
  columnKey: BoardColumnKey;
  title: string;
  subtitle?: string;
  rows: LaneRow[];
  cards: DrawerCard[];
  visibleCardFields: CardFieldKey[];
  onOpenCard: (id: number) => void;
  onClose: () => void;
  onCardDrop?: (drag: DragCardPayload, target: BoardDropTarget) => void;
}) {
  return (
    <ClickAwayListener onClickAway={() => open && onClose()}>
      {/* Wrapper NEBLOKUJE interakce pod sebou */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: (t) => t.zIndex.drawer + 2,
          pointerEvents: "none",
        }}
      >
        <Slide direction="right" in={open} mountOnEnter unmountOnExit>
          <Paper
            elevation={10}
            sx={{
              pointerEvents: "auto",
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              width: POOL_DRAWER_WIDTH,
              maxWidth: "92vw",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            {/* Header */}
            <Box sx={{ p: 2, pb: 1.25 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>
                    {title}
                  </Typography>
                  {subtitle ? (
                    <Typography variant="caption" color="text.secondary">
                      {subtitle}
                    </Typography>
                  ) : null}
                </Box>

                <IconButton onClick={onClose} aria-label="Close drawer">
                  <CloseIcon />
                </IconButton>
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Drawer je “pool” sloupec. Kartu můžeš přetáhnout <b>z draweru do sloupce</b> i
                opačně.
              </Typography>
            </Box>

            <Divider />

            {/* Drop zone + list */}
            <Box
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

                  // dropping INTO pool keeps current swimlane/nested
                  const row = findRow(rows, drag.fromLaneKey, drag.fromNestedKey);

                  const target: BoardDropTarget = {
                    columnKey,
                    laneKey: drag.fromLaneKey,
                    laneLabel: row?.laneLabel ?? "—",
                    laneApiValue: row?.laneApiValue,
                    nestedKey: drag.fromNestedKey,
                    nestedLabel: row?.nestedLabel,
                    nestedApiValue: row?.nestedApiValue,
                  };

                  onCardDrop(drag, target);
                } catch {
                  // noop
                }
              }}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: 1.5,
                bgcolor: "background.default",
              }}
            >
              {cards.length === 0 ? (
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    textAlign: "center",
                    color: "text.secondary",
                    fontSize: 13,
                    bgcolor: "background.paper",
                  }}
                >
                  Prázdné ✅ (sem můžeš dropnout kartu z boardu)
                </Box>
              ) : (
                <Stack spacing={0.75}>
                  {cards.map((x) => (
                    <KanbanCard
                      key={`${x.card.id}-${x.laneKey}-${x.nestedKey ?? ""}`}
                      card={x.card}
                      onOpen={onOpenCard}
                      visibleCardFields={visibleCardFields}
                      draggable
                      dragPayload={{
                        cardId: x.card.id,
                        fromColumnKey: columnKey,
                        fromLaneKey: x.laneKey,
                        fromNestedKey: x.nestedKey,
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        </Slide>
      </Box>
    </ClickAwayListener>
  );
}