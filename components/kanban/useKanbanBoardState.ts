import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";

export default function AnnouncementBar(props: {
  announcementText?: string;
  currentLitterCode?: string;
}) {
  const text = (props.announcementText ?? "").trim();
  const code = (props.currentLitterCode ?? "").trim();

  if (!text) return null;

  // Server-safe (bez @mui/material/styles/alpha)
  const borderColor = "rgba(15, 23, 42, 0.08)"; // ~ alpha(#0F172A, 0.08)
  const bgColor = "rgba(11, 61, 145, 0.06)";    // ~ alpha(primary.main, 0.06)

  return (
    <Box sx={{ borderBottom: `1px solid ${borderColor}`, bgcolor: bgColor }}>
      <Container sx={{ py: 1 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 0.6 }}>
              AKTUÁLNĚ
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {text}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            {code ? (
              <Button component={Link} href={`/vrhy/${code}`} size="small" variant="contained">
                Detail vrhu {code}
              </Button>
            ) : null}
            <Button component={Link} href="/stenata/prihlaska" size="small" variant="outlined">
              Rezervace
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}