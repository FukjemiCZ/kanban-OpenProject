"use client";

import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { CardFieldKey, DragCardPayload, WorkPackage } from "./kanban.types";
import { normalizeValue } from "./kanban.utils";
import { hexToRgba } from "@/lib/color";

export function KanbanCard({
  card,
  onOpen,
  visibleCardFields,
  draggable = false,
  dragPayload,
  onDragStartCard,
}: {
  card: WorkPackage;
  onOpen: (id: number) => void;
  visibleCardFields: CardFieldKey[];
  draggable?: boolean;
  dragPayload?: DragCardPayload;
  onDragStartCard?: (payload: DragCardPayload) => void;
}) {
  const labels: Record<CardFieldKey, string> = {
    projectName: "Projekt",
    assigneeName: "Assignee",
    priorityName: "Priorita",
    typeName: "Typ",
    authorName: "Author",
    responsibleName: "Responsible",
  };

  const bg = card.statusColor ? hexToRgba(card.statusColor, 0.3) : undefined;

  return (
    <Card
      variant="outlined"
      draggable={draggable}
      onDragStart={(e) => {
        if (!dragPayload) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/json", JSON.stringify(dragPayload));
        onDragStartCard?.(dragPayload);
      }}
      sx={{
        minWidth: 0,
        cursor: draggable ? "grab" : "pointer",
        "&:active": { cursor: draggable ? "grabbing" : "pointer" },

        // ✅ background based on status color (70% transparent => alpha 0.30)
        backgroundColor: bg,

        // ✅ optional left stripe (full color) for better scanability
        position: "relative",
        ...(card.statusColor
          ? {
              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 6,
                backgroundColor: card.statusColor,
                borderTopLeftRadius: 4,
                borderBottomLeftRadius: 4,
              },
            }
          : null),
      }}
    >
      <CardActionArea onClick={() => onOpen(card.id)}>
        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 }, minWidth: 0 }}>
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Chip size="small" label={`#${card.id}`} />
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                noWrap
                title={card.subject}
              >
                {card.subject}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {visibleCardFields.map((field) => {
                const value = normalizeValue(card[field]);
                if (value === "—") return null;
                const outlined = !(field === "projectName" || field === "assigneeName");

                return (
                  <Chip
                    key={field}
                    size="small"
                    variant={outlined ? "outlined" : "filled"}
                    label={`${labels[field]}: ${value}`}
                    sx={{ maxWidth: "100%" }}
                  />
                );
              })}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}