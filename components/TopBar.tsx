"use client";

import { AppBar, Button, Toolbar, Typography } from "@mui/material";

export function TopBar({ title, userName }: { title: string; userName?: string }) {
  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Toolbar sx={{ display: "flex", gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {userName ? (
          <Typography variant="body2" color="text.secondary">
            {userName}
          </Typography>
        ) : null}
        <Button href="/api/auth/logout" color="inherit" variant="outlined" size="small">
          Odhlásit
        </Button>
      </Toolbar>
    </AppBar>
  );
}
