import "server-only";

/** Centralised, server-only access to configuration. Never import from client components. */
const read = (k: string) => {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
};

export const env = {
  searchProvider: () => read("SEARCH_PROVIDER")?.toLowerCase(),
  braveKey: () => read("BRAVE_SEARCH_API_KEY"),
  tavilyKey: () => read("TAVILY_API_KEY"),
  serpapiKey: () => read("SERPAPI_API_KEY"),
  googleCseKey: () => read("GOOGLE_CSE_API_KEY"),
  googleCseId: () => read("GOOGLE_CSE_ID"),
  googleMapsKey: () => read("GOOGLE_MAPS_API_KEY"),
  osmContact: () => read("OSM_CONTACT_EMAIL"),
  databaseUrl: () => read("DATABASE_URL"),
  dbPoolMax: () => Number(read("DATABASE_POOL_MAX") ?? 10),
  sessionSecret: () => read("SESSION_SECRET"),
  allowedOrigins: () =>
    (read("ALLOWED_ORIGINS") ?? "http://localhost:3000")
      .split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter((s) => s && s !== "*"),
  /** Value for the `source` column on every DB insert. */
  dataSource: (): "local" | "production" => {
    const v = read("DATA_SOURCE");
    if (v === "local" || v === "production") return v;
    return process.env.NODE_ENV === "production" ? "production" : "local";
  },
};

export const USER_AGENT = () =>
  `CakeRecipeFinder/1.0 (+recipe research; ${env.osmContact() ?? "contact via site"})`;
