"use client";

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
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useEffect, useMemo, useState } from "react";

type Detail = {
  id: number;
  lockVersion?: number; // IMPORTANT: musí přijít z API pro PATCH
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

function toDateInputValue(v?: string | null) {
  // API typicky vrací YYYY-MM-DD, což je OK pro input[type=date].
  // Kdyby přišlo ISO s časem, vezmeme první část.
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

function parsePercent(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(n)));
  return clamped;
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
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [percentageDone, setPercentageDone] = useState<string>("");

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

    async function run() {
      setLoading(true);
      setError(null);
      setDetail(null);
      setEditMode(false);

      try {
        const res = await fetch(`/api/work-packages/${workPackageId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }

        if (!cancelled) {
          setDetail(data);
          resetFormFromDetail(data);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workPackageId]);

  const opHref = useMemo(() => {
    const href = detail?._links?.self?.href;
    if (!href) return null;
    return href;
  }, [detail]);

  const rawDescription = detail?.description?.raw?.trim();

  const canEdit = Boolean(detail?.id);

  async function onSave() {
    if (!detail) return;

    const lockVersion = detail.lockVersion;
    if (typeof lockVersion !== "number") {
      setError(
        "Chybí lockVersion v detailu work package. Uprav /api/work-packages/:id aby vracel lockVersion (OpenProject ho vyžaduje pro PATCH)."
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // payload jen s tím, co měníme (a lockVersion vždy)
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
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      // Nejrobustnější je reloadnout detail (kvůli lockVersion + server-side normalizaci)
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
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">
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
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {detail?.subject || "Detail work package"}
              </Typography>
            )}
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

          {canEdit && !editMode ? (
            <IconButton
              onClick={() => {
                resetFormFromDetail(detail);
                setEditMode(true);
              }}
              title="Upravit"
            >
              <EditIcon />
            </IconButton>
          ) : null}

          <IconButton
            onClick={() => {
              setEditMode(false);
              onClose();
            }}
            title="Zavřít"
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        {editMode ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="flex-end">
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
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              disabled={saving}
              onClick={onSave}
            >
              Save
            </Button>
          </Stack>
        ) : null}
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

              {editMode ? (
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    <TextField
                      label="Start"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Due"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      fullWidth
                    />
                  </Stack>

                  <TextField
                    label="Hotovo (%)"
                    value={percentageDone}
                    onChange={(e) => setPercentageDone(e.target.value)}
                    inputProps={{ inputMode: "numeric" }}
                    helperText="0–100"
                    fullWidth
                  />
                </Stack>
              ) : (
                <Stack spacing={0.75}>
                  <Typography variant="body2">
                    <strong>Start:</strong> {formatDate(detail.startDate)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Due:</strong> {formatDate(detail.dueDate)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Hotovo:</strong>{" "}
                    {typeof detail.percentageDone === "number"
                      ? `${detail.percentageDone}%`
                      : "—"}
                  </Typography>
                </Stack>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Popis
              </Typography>

              {editMode ? (
                <TextField
                  label="Description (Markdown)"
                  value={descriptionRaw}
                  onChange={(e) => setDescriptionRaw(e.target.value)}
                  fullWidth
                  multiline
                  minRows={8}
                />
              ) : rawDescription ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
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