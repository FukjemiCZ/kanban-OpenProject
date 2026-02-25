"use client";

import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import { useEffect, useMemo, useState } from "react";

export type LinkRef = { href: string; title?: string };
export type WorkPackage = {
  id: number;
  lockVersion: number;
  subject?: string;
  description?: { format?: string; raw?: string; html?: string };
  startDate?: string | null;
  dueDate?: string | null;
  _links?: Record<string, LinkRef | undefined> & {
    status?: LinkRef;
    assignee?: LinkRef;
    priority?: LinkRef;
    type?: LinkRef;
    project?: LinkRef;
  };
};

type AllowedValue = { href: string; title: string };
type WorkPackageForm = {
  // pouze co potřebujeme pro selecty; rozšiř si dle potřeby
  allowed?: {
    status?: AllowedValue[];
    assignee?: AllowedValue[];
    priority?: AllowedValue[];
  };
};

type Props = {
  open: boolean;
  onClose: () => void;

  workPackageId: number | null;

  /** Pokud už detail načítáš jinde, můžeš poslat rovnou */
  initial?: WorkPackage | null;

  /** Zavolej po uložení aby se refreshnul board/list */
  onSaved?: (updated: WorkPackage) => void;
};

function linkHref(v?: LinkRef | null): string | null {
  if (!v?.href) return null;
  return v.href;
}

function pickIdFromHref(href: string): string {
  // "/api/v3/statuses/3" -> "3"
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? href;
}

export default function IssueDrawer({
  open,
  onClose,
  workPackageId,
  initial,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [wp, setWp] = useState<WorkPackage | null>(initial ?? null);

  const [edit, setEdit] = useState(false);

  // edit-state
  const [subject, setSubject] = useState("");
  const [descriptionRaw, setDescriptionRaw] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [statusHref, setStatusHref] = useState<string>("");
  const [assigneeHref, setAssigneeHref] = useState<string>("");
  const [priorityHref, setPriorityHref] = useState<string>("");

  const [form, setForm] = useState<WorkPackageForm | null>(null);

  const canEdit = useMemo(() => {
    // pokud chceš, můžeš navázat na permissions z API,
    // zatím to bereme tak, že když máme lockVersion a id -> edit jde.
    return Boolean(wp?.id && typeof wp?.lockVersion === "number");
  }, [wp?.id, wp?.lockVersion]);

  function resetEditState(from: WorkPackage | null) {
    setSubject(from?.subject ?? "");
    setDescriptionRaw(from?.description?.raw ?? "");
    setStartDate(from?.startDate ?? "");
    setDueDate(from?.dueDate ?? "");

    setStatusHref(linkHref(from?._links?.status) ?? "");
    setAssigneeHref(linkHref(from?._links?.assignee) ?? "");
    setPriorityHref(linkHref(from?._links?.priority) ?? "");
  }

  async function loadDetail(id: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/openproject/work-packages/${id}`, { method: "GET" });
      if (!res.ok) throw new Error(`Failed to load work package ${id}: ${res.status}`);
      const data = (await res.json()) as WorkPackage;
      setWp(data);
      resetEditState(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadForm(id: number) {
    // Volitelné: form endpoint pro “allowed values” pro selecty.
    // Pokud nemáš, můžeš to zkusit vynechat a selecty schovat.
    try {
      const res = await fetch(`/api/openproject/work-packages/${id}/form`, { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as WorkPackageForm;
      setForm(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!workPackageId) return;

    // pokud přišel initial pro stejné id, použij ho
    if (initial?.id === workPackageId) {
      setWp(initial);
      resetEditState(initial);
      loadForm(workPackageId);
      return;
    }

    loadDetail(workPackageId);
    loadForm(workPackageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workPackageId]);

  async function onSave() {
    if (!wp) return;
    if (!canEdit) return;

    setSaving(true);
    try {
      const payload: any = {
        lockVersion: wp.lockVersion,
      };

      // Subject
      if (subject !== (wp.subject ?? "")) payload.subject = subject;

      // Description
      const prevDesc = wp.description?.raw ?? "";
      if (descriptionRaw !== prevDesc) {
        payload.description = { format: wp.description?.format ?? "markdown", raw: descriptionRaw };
      }

      // Dates
      const prevStart = wp.startDate ?? "";
      if ((startDate || "") !== prevStart) payload.startDate = startDate || null;

      const prevDue = wp.dueDate ?? "";
      if ((dueDate || "") !== prevDue) payload.dueDate = dueDate || null;

      // Links: status/assignee/priority
      const links: any = {};
      const prevStatusHref = linkHref(wp._links?.status) ?? "";
      if ((statusHref || "") !== prevStatusHref && statusHref) links.status = { href: statusHref };

      const prevAssigneeHref = linkHref(wp._links?.assignee) ?? "";
      if ((assigneeHref || "") !== prevAssigneeHref) {
        // assignee může být "null" -> v OP se typicky posílá href: null nebo se vynechá,
        // tady držíme jednoduché: prázdný string = vynechat.
        if (assigneeHref) links.assignee = { href: assigneeHref };
      }

      const prevPriorityHref = linkHref(wp._links?.priority) ?? "";
      if ((priorityHref || "") !== prevPriorityHref && priorityHref) links.priority = { href: priorityHref };

      if (Object.keys(links).length > 0) payload._links = links;

      const res = await fetch(`/api/openproject/work-packages/${wp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Save failed: ${res.status} ${text}`);
      }

      const updated = (await res.json()) as WorkPackage;
      setWp(updated);
      resetEditState(updated);
      setEdit(false);

      onSaved?.(updated);
    } finally {
      setSaving(false);
    }
  }

  const title = wp ? `#${wp.id} ${wp.subject ?? ""}` : "Issue";

  const allowedStatus = form?.allowed?.status ?? [];
  const allowedAssignee = form?.allowed?.assignee ?? [];
  const allowedPriority = form?.allowed?.priority ?? [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => {
        setEdit(false);
        onClose();
      }}
      PaperProps={{ sx: { width: { xs: "100%", sm: 520 } } }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap title={title}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {wp?._links?.project?.title ? `Project: ${wp._links.project.title}` : ""}
          </Typography>
        </Box>

        {canEdit && !edit && (
          <IconButton aria-label="Edit" onClick={() => setEdit(true)}>
            <EditIcon />
          </IconButton>
        )}

        {edit && (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              disabled={saving}
              onClick={onSave}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CancelIcon />}
              disabled={saving}
              onClick={() => {
                resetEditState(wp);
                setEdit(false);
              }}
            >
              Cancel
            </Button>
          </Stack>
        )}

        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {loading ? (
        <Box sx={{ p: 3 }}>
          <CircularProgress />
        </Box>
      ) : !wp ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ opacity: 0.7 }}>No issue selected.</Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            {/* Subject */}
            {edit ? (
              <TextField
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                fullWidth
              />
            ) : (
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Subject
                </Typography>
                <Typography>{wp.subject ?? ""}</Typography>
              </Box>
            )}

            {/* Status */}
            {(allowedStatus.length > 0 || wp._links?.status) && (
              edit ? (
                <TextField
                  select
                  label="Status"
                  value={statusHref || ""}
                  onChange={(e) => setStatusHref(e.target.value)}
                  fullWidth
                >
                  {allowedStatus.length === 0 ? (
                    <MenuItem value={statusHref || ""}>
                      {wp._links?.status?.title ?? pickIdFromHref(statusHref || "")}
                    </MenuItem>
                  ) : (
                    allowedStatus.map((s) => (
                      <MenuItem key={s.href} value={s.href}>
                        {s.title}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              ) : (
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Status
                  </Typography>
                  <Typography>{wp._links?.status?.title ?? ""}</Typography>
                </Box>
              )
            )}

            {/* Assignee */}
            {(allowedAssignee.length > 0 || wp._links?.assignee) && (
              edit ? (
                <TextField
                  select
                  label="Assignee"
                  value={assigneeHref || ""}
                  onChange={(e) => setAssigneeHref(e.target.value)}
                  fullWidth
                >
                  {/* volitelně: Unassigned */}
                  <MenuItem value="">
                    — Unassigned —
                  </MenuItem>
                  {allowedAssignee.map((u) => (
                    <MenuItem key={u.href} value={u.href}>
                      {u.title}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Assignee
                  </Typography>
                  <Typography>{wp._links?.assignee?.title ?? "—"}</Typography>
                </Box>
              )
            )}

            {/* Priority */}
            {(allowedPriority.length > 0 || wp._links?.priority) && (
              edit ? (
                <TextField
                  select
                  label="Priority"
                  value={priorityHref || ""}
                  onChange={(e) => setPriorityHref(e.target.value)}
                  fullWidth
                >
                  {allowedPriority.map((p) => (
                    <MenuItem key={p.href} value={p.href}>
                      {p.title}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Priority
                  </Typography>
                  <Typography>{wp._links?.priority?.title ?? "—"}</Typography>
                </Box>
              )
            )}

            {/* Dates */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {edit ? (
                <>
                  <TextField
                    label="Start date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={startDate || ""}
                    onChange={(e) => setStartDate(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Due date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={dueDate || ""}
                    onChange={(e) => setDueDate(e.target.value)}
                    fullWidth
                  />
                </>
              ) : (
                <>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Start date
                    </Typography>
                    <Typography>{wp.startDate ?? "—"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Due date
                    </Typography>
                    <Typography>{wp.dueDate ?? "—"}</Typography>
                  </Box>
                </>
              )}
            </Stack>

            {/* Description */}
            {edit ? (
              <TextField
                label="Description (Markdown)"
                value={descriptionRaw}
                onChange={(e) => setDescriptionRaw(e.target.value)}
                fullWidth
                multiline
                minRows={8}
              />
            ) : (
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Description
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>
                  {wp.description?.raw ?? ""}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}