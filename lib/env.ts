function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  openProjectBaseUrl: req("OPENPROJECT_BASE_URL").replace(/\/+$/, ""),
  clientId: req("OPENPROJECT_CLIENT_ID"),
  clientSecret: req("OPENPROJECT_CLIENT_SECRET"),
  redirectUri: req("OPENPROJECT_REDIRECT_URI"),
  sessionSecret: req("APP_SESSION_SECRET"),
};
