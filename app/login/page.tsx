export default function LoginPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Přihlášení</h1>
      <p>Pokračuj přes lokální účet v OpenProjectu.</p>
      <a
        href="/api/auth/login"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ccc",
          textDecoration: "none",
        }}
      >
        Login přes OpenProject OAuth
      </a>
    </main>
  );
}
