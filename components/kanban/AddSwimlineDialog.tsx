"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export type SwimlineOption = {
  key: string;              // stabilní klíč (href / __null__ / label:xxx)
  label: string;            // text v UI
  apiValue?: string | null; // href nebo null (Nezařazeno)
  groupField: string;       // assigneeName/typeName/...
};

export function AddSwimlineDialog({
  open,
  onClose,
  title,
  groupField,
  options,
  loading,
  query,
  onQueryChange,
  onRefresh,
  onAdd,
  allowNullOption = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  groupField: string;
  options: SwimlineOption[];
  loading: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  onRefresh?: () => void;
  onAdd: (option: SwimlineOption) => void;
  allowNullOption?: boolean;
}) {
  const [selected, setSelected] = useState<SwimlineOption | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
    }
  }, [open]);

  const mergedOptions = useMemo(() => {
    const out = [...options];
    if (allowNullOption) {
      const hasNull = out.some((o) => o.key === "__null__");
      if (!hasNull) {
        out.unshift({
          key: "__null__",
          label: "Nezařazeno",
          apiValue: null,
          groupField,
        });
      }
    }
    return out;
  }, [allowNullOption, groupField, options]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete
            options={mergedOptions}
            loading={loading}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.key === b.key}
            filterOptions={(x) => x} // server-side filtering + local fallback
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vyhledat hodnotu swimline"
                placeholder="např. Petr Fuk, Task, High..."
                onChange={(e) => onQueryChange(e.target.value)}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.key}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {option.label}
                  </Typography>
                  {option.apiValue === null ? (
                    <Chip size="small" label="null" variant="outlined" />
                  ) : null}
                </Stack>
              </li>
            )}
          />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Přidá prázdnou swimline i když aktuálně neobsahuje žádný ticket. Poté do ní můžeš
              ticket přetáhnout.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {onRefresh ? (
              <Button variant="outlined" size="small" onClick={onRefresh}>
                Obnovit možnosti
              </Button>
            ) : null}
            {selected ? (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`Vybráno: ${selected.label}`}
              />
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Zavřít</Button>
        <Button
          variant="contained"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            onAdd(selected);
            onClose();
          }}
        >
          Přidat swimline
        </Button>
      </DialogActions>
    </Dialog>
  );
}