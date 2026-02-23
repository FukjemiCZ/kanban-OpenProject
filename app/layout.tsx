import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif" }}>{children}</body>
    </html>
  );
}
