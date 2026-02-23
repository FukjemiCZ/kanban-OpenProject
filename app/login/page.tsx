import Link from "next/link";
import { Button, Container, Paper, Stack, Typography } from "@mui/material";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = (await searchParams) ?? {};
  const rawReturnTo = Array.isArray(sp.returnTo) ? sp.returnTo[0] : sp.returnTo;

  const safeReturnTo =
    rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/board";

  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(safeReturnTo)}`;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Přihlášení
          </Typography>

          <Typography color="text.secondary">
            Pokračuj přes lokální účet v OpenProjectu.
          </Typography>

          <Button component={Link} href={loginHref} variant="contained" size="large">
            Login přes OpenProject OAuth
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}