import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main style={{ padding: 24 }}>
      <h1>OpenProject Modern Kanban Demo</h1>
      <p>MVP demo: OAuth login přes OpenProject + jednoduchý kanban nad API v3.</p>

      {session ? (
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/board">Otevřít board</Link>
          <a href="/api/auth/logout">Odhlásit</a>
        </div>
      ) : (
        <Link href="/login">Přihlásit přes OpenProject</Link>
      )}
    </main>
  );
}
