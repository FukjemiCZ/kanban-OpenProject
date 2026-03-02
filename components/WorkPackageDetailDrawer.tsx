"use client";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Detail = {
  id: number;
  lockVersion?: number;
  subject: string;
  description?: { raw?: string; html?: string; format?: string } | null;
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

function toDateInputValue(v?: string | null) {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

function parsePercent(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
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

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // edit state
  const [subject, setSubject] = useState("");
  const [descriptionRaw, setDescriptionRaw] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [percentageDone, setPercentageDone] = useState("");

  function resetFormFromDetail(d: Detail | null) {
    setSubject(d?.subject ?? "");
    setDescriptionRaw(d?.description?.raw ?? "");
    setStartDate(toDateInputValue(d?.startDate ?? null));
    setDueDate(toDateInputValue(d?.dueDate ?? null));
    setPercentageDone(
      typeof d?.percentageDone === "number" && Number.isFinite(d.percentageDone)
        ? String(d.percentageDone)
        : ""
    );
  }

  async function loadDetail(id: number) {
    setLoading(true);
    setError(null);
    setDetail(null);

    try {
      const res = await fetch(`/api/work-packages/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDetail(data);
      resetFormFromDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !workPackageId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      setEditMode(false);

      try {
        const res = await fetch(`/api/work-packages/${workPackageId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!cancelled) {
          setDetail(data);
          resetFormFromDetail(data);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, workPackageId]);

  const opHref = useMemo(() => detail?._links?.self?.href ?? null, [detail]);
  const canEdit = Boolean(detail?.id);

  async function onSave() {
    if (!detail) return;

    const lockVersion = detail.lockVersion;
    if (typeof lockVersion !== "number") {
      setError(
        "Chybí lockVersion v detailu work package.\nUprav /api/work-packages/:id aby vracel lockVersion (OpenProject ho vyžaduje pro PATCH)."
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = { lockVersion };

      const prevSubject = detail.subject ?? "";
      if (subject !== prevSubject) payload.subject = subject;

      const prevDesc = detail.description?.raw ?? "";
      if ((descriptionRaw ?? "") !== prevDesc) {
        payload.description = {
          format: detail.description?.format ?? "markdown",
          raw: descriptionRaw ?? "",
        };
      }

      const prevStart = toDateInputValue(detail.startDate ?? null);
      if ((startDate ?? "") !== prevStart) payload.startDate = startDate ? startDate : null;

      const prevDue = toDateInputValue(detail.dueDate ?? null);
      if ((dueDate ?? "") !== prevDue) payload.dueDate = dueDate ? dueDate : null;

      const prevPct =
        typeof detail.percentageDone === "number" && Number.isFinite(detail.percentageDone)
          ? detail.percentageDone
          : null;
      const nextPct = parsePercent(percentageDone);
      if (nextPct !== prevPct) payload.percentageDone = nextPct;

      const res = await fetch(`/api/work-packages/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await loadDetail(detail.id);
      setEditMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => {
        setEditMode(false);
        onClose();
      }}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 520, md: 640 },
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              Work package {workPackageId ? `#${workPackageId}` : ""}
            </Typography>

            {editMode ? (
              <TextField
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                label="Subject"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
              />
            ) : (
              <Typography variant="h6" sx={{ wordBreak: "break-word" }}>
                {detail?.subject || "Detail work package"}
              </Typography>
            )}
          </Box>

          <Stack direction="row" alignItems="center" gap={0.5}>
            {opHref ? (
              <IconButton
                size="small"
                title="Otevřít v OpenProject"
                onClick={() => window.open(opHref, "_blank", "noreferrer")}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            ) : null}

            {canEdit && !editMode ? (
              <IconButton
                size="small"
                title="Upravit"
                onClick={() => {
                  resetFormFromDetail(detail);
                  setEditMode(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            ) : null}

            <IconButton
              size="small"
              title="Zavřít"
              onClick={() => {
                setEditMode(false);
                onClose();
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {editMode ? (
          <Stack direction="row" gap={1} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              disabled={saving}
              onClick={() => {
                resetFormFromDetail(detail);
                setEditMode(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={onSave}>
              Save
            </Button>
          </Stack>
        ) : null}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2 }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : error ? (
          <Typography color="error" sx={{ whiteSpace: "pre-wrap" }}>
            {error}
          </Typography>
        ) : !detail ? (
          <Typography color="text.secondary">Žádná data</Typography>
        ) : (
          <Stack gap={2}>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {detail._links?.status?.title ? <Chip label={detail._links.status.title} /> : null}
              {detail._links?.type?.title ? <Chip label={detail._links.type.title} /> : null}
              {detail._links?.priority?.title ? <Chip label={detail._links.priority.title} /> : null}
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle2">Kontext</Typography>
              <Typography variant="body2" color="text.secondary">
                Projekt: {detail._links?.project?.title || "—"}
                <br />
                Assignee: {detail._links?.assignee?.title || "—"}
                <br />
                Author: {detail._links?.author?.title || "—"}
                <br />
                Responsible: {detail._links?.responsible?.title || "—"}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2">Termíny a postup</Typography>

              {editMode ? (
                <Stack gap={1} sx={{ mt: 1 }}>
                  <TextField
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="Due date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="Percentage done"
                    value={percentageDone}
                    onChange={(e) => setPercentageDone(e.target.value)}
                    inputProps={{ inputMode: "numeric" }}
                    helperText="0–100"
                    fullWidth
                  />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Start: {formatDate(detail.startDate)}
                  <br />
                  Due: {formatDate(detail.dueDate)}
                  <br />
                  Hotovo:{" "}
                  {typeof detail.percentageDone === "number" ? `${detail.percentageDone}%` : "—"}
                </Typography>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Popis
              </Typography>

              {editMode ? (
                <TextField
                  value={descriptionRaw}
                  onChange={(e) => setDescriptionRaw(e.target.value)}
                  fullWidth
                  multiline
                  minRows={8}
                />
              ) : !detail.description?.raw?.trim() && !detail.description?.html?.trim() ? (
                <Typography variant="body2" color="text.secondary">
                  Bez popisu
                </Typography>
              ) : (
                <MarkdownRenderer raw={detail.description?.raw ?? null} html={detail.description?.html ?? null} />
              )}
            </Box>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}