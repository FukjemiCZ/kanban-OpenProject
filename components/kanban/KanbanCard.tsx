"use client";

import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { CardFieldKey, WorkPackage } from "./kanban.types";
import { normalizeValue } from "./kanban.utils";

export function KanbanCard({
  card,
  onOpen,
  visibleCardFields,
}: {
  card: WorkPackage;
  onOpen: (id: number) => void;
  visibleCardFields: CardFieldKey[];
}) {
  const labels: Record<CardFieldKey, string> = {
    projectName: "Projekt",
    assigneeName: "Assignee",
    priorityName: "Priorita",
    typeName: "Typ",
    authorName: "Author",
    responsibleName: "Responsible",
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <CardActionArea onClick={() => onOpen(card.id)}>
        <CardContent
          sx={{
            minWidth: 0,
            overflow: "hidden",
            "&:last-child": { pb: 1.5 },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            #{card.id}
          </Typography>

          <Typography
            variant="subtitle2"
            sx={{
              mt: 0.5,
              minWidth: 0,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              wordBreak: "break-word",
            }}
          >
            {card.subject}
          </Typography>

          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 1, minWidth: 0, maxWidth: "100%" }}
          >
            {visibleCardFields.map((field) => {
              const value = normalizeValue(card[field]);
              if (value === "—") return null;
              const outlined = !(field === "projectName" || field === "assigneeName");

              return (
                <Chip
                  key={`${card.id}-${field}`}
                  size="small"
                  variant={outlined ? "outlined" : "filled"}
                  label={`${labels[field]}: ${value}`}
                  sx={{
                    maxWidth: "100%",
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    },
                  }}
                />
              );
            })}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}