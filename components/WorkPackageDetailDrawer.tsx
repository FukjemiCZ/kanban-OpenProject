"use client";

import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEffect, useMemo, useState } from "react";

type Detail = {
  id: number;
  subject: string;
  description?: {
    raw?: string;
    html?: string;
    format?: string;
  } | null;
  startDate?: string | null;
  dueDate?: string | null;
  percentageDone?: number | null;
  _links?: {
    self?: { href: string; title?: string };
    status?: { href: string; title?: string };
    assignee?: { href: string; title?: string } | null;
    project?: { href: string; title?: string };
    priority?: { href: string; title?: string };
    type?: { href: string; title?: string };
    author?: { href: string; title?: string };
    responsible?: { href: string; title?: string } | null;
  };
};

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("cs-CZ").format(d);
}

export function WorkPackageDetailDrawer({
  open,
  workPackageId,
  onClose,
}: {
  open: boolean;
  workPackageId: number | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workPackageId) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setDetail(null);

      try {
        const res = await fetch(`/api/work-packages/${workPackageId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }

        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [open, workPackageId]);

  const opHref = useMemo(() => {
    const href = detail?._links?.self?.href;
    if (!href) return null;
    return href; // bývá absolutní URL OpenProject API/work_package self
  }, [detail]);

  const rawDescription = detail?.description?.raw?.trim();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 520, md: 640 },
          p: 0,
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Work package {workPackageId ? `#${workPackageId}` : ""}
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {detail?.subject || "Detail work package"}
            </Typography>
          </Box>

          {opHref ? (
            <IconButton
              component="a"
              href={opHref}
              target="_blank"
              rel="noreferrer"
              title="Open in OpenProject"
            >
              <OpenInNewIcon />
            </IconButton>
          ) : null}

          <IconButton onClick={onClose} title="Zavřít">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ p: 2, overflowY: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : !detail ? (
          <Typography color="text.secondary">Žádná data</Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {detail._links?.status?.title ? (
                <Chip label={`Status: ${detail._links.status.title}`} />
              ) : null}
              {detail._links?.type?.title ? (
                <Chip variant="outlined" label={`Typ: ${detail._links.type.title}`} />
              ) : null}
              {detail._links?.priority?.title ? (
                <Chip variant="outlined" label={`Priorita: ${detail._links.priority.title}`} />
              ) : null}
            </Stack>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Kontext
              </Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2">
                  <strong>Projekt:</strong> {detail._links?.project?.title || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Assignee:</strong> {detail._links?.assignee?.title || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Author:</strong> {detail._links?.author?.title || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Responsible:</strong> {detail._links?.responsible?.title || "—"}
                </Typography>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Termíny a postup
              </Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2">
                  <strong>Start:</strong> {formatDate(detail.startDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Due:</strong> {formatDate(detail.dueDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Hotovo:</strong>{" "}
                  {typeof detail.percentageDone === "number" ? `${detail.percentageDone}%` : "—"}
                </Typography>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Popis
              </Typography>
              {rawDescription ? (
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                >
                  {rawDescription}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Bez popisu
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}