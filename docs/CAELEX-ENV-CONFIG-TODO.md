# Caelex — offene Env-Variablen (Konfig-TODO)

> Stand 2026-06-03. Vergleich: in **Production gesetzt** (23 Vars) vs. **im Code referenziert** (120).
> Werte setzt du selbst (`vercel env add NAME production`). Diese Liste sagt dir nur, **was etwas freischaltet** vs. **was sichere Defaults hat**.
> Bereits gesetzt + ok: DATABASE*URL, AUTH_SECRET, AUTH_URL, ENCRYPTION_KEY/SALT, ANTHROPIC_API_KEY, AI_GATEWAY_API_KEY, ATLAS_SEMANTIC_ENABLED, R2_ENDPOINT/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME, RESEND_API_KEY, CRON_SECRET, AUTH_GOOGLE_ID/SECRET, VERITY_MASTER_KEY, COPERNICUS*\*, EU_DISCOS_API_KEY, NEXT_PUBLIC_APP_URL.

## A) Empfohlen — schaltet Funktion frei / härtet Production

| Var                                                            | Was es bewirkt                                                                                                                                                          | Hinweis                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `R2_PUBLIC_URL`                                                | **Firm-Logo-Upload** (Atlas-Einstellungen → Kanzlei). Ohne → Route gibt 503, Logo lässt sich nicht setzen.                                                              | Basis-URL des öffentlichen R2-Buckets / der Custom-Domain (z.B. `https://assets.caelex.eu`). |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`          | **Verteiltes Rate-Limiting**. Ohne → In-Memory-Fallback (~50 % niedrigere Limits, nicht instanz-übergreifend) → schwächerer Abuse-Schutz.                               | Upstash-Redis (Vercel-Marketplace-Integration provisioniert beide automatisch).              |
| `WEBAUTHN_RP_ID` + `WEBAUTHN_ORIGIN`                           | **Passkeys** (Atlas-Security-Tab) zuverlässiger. Ohne → wird aus dem Request-Host abgeleitet (funktioniert meist, aber explizit = robuster, v.a. mit mehreren Domains). | `WEBAUTHN_RP_ID=caelex.eu`, `WEBAUTHN_ORIGIN=https://www.caelex.eu`.                         |
| `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) | **Error-Monitoring** in Production.                                                                                                                                     | Optional, aber für Betrieb sehr empfehlenswert.                                              |

## B) Nur falls das jeweilige Feature genutzt wird

| Var(s)                                                                                                                    | Feature                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                      | **Billing** (von dir bewusst vertagt).                                                                                                                                       |
| `GOOGLE_CALENDAR_CLIENT_ID/SECRET/REFRESH_TOKEN/ID`                                                                       | **Google-Kalender-Sync** — relevant fürs Fristen-Feature, falls Fristen in Google Calendar gespiegelt werden sollen. In-App-Fristen + E-Mail-Erinnerungen laufen **ohne**.   |
| `SSO_ENCRYPTION_KEY`                                                                                                      | **Enterprise-SSO** (SAML/OIDC). Fällt sonst auf NEXTAUTH_SECRET zurück (auch ungesetzt) → SSO-Verschlüsselung nicht einsatzbereit. Nur nötig, wenn SSO-Login angeboten wird. |
| `OPENAI_API_KEY` (+ `OPENAI_BASE_URL`)                                                                                    | Direkter-OpenAI-Pfad. **Haupt-KI läuft über Anthropic + AI-Gateway (beide gesetzt)** — nur nötig, falls ein OpenAI-spezifisches Feature aktiviert wird.                      |
| `AUTH_APPLE_ID/SECRET`                                                                                                    | Apple-Login.                                                                                                                                                                 |
| `LOGSNAG_TOKEN`                                                                                                           | Event-Tracking.                                                                                                                                                              |
| `COMPANIES_HOUSE_API_KEY`, `NVD_API_KEY`, `EU_SST_API_KEY`, `ORBIS_API_KEY`, `SPACETRACK_IDENTITY/PASSWORD`, `IP_API_KEY` | Externe Daten-APIs für ihre jeweiligen Spezial-Module.                                                                                                                       |
| `SEARCH_CONSOLE_GOOGLE/BING/YANDEX`, `INDEXNOW_KEY/PUSH_SECRET`                                                           | SEO / Site-Verification.                                                                                                                                                     |

## C) Ignorieren — sichere Defaults, Aliase oder nicht nötig

- **E-Mail:** `SMTP_*`, `EMAIL_FROM`, `EMAIL_FROM_NAME` — Versand läuft über Resend (`RESEND_API_KEY` gesetzt); SMTP ist nur Fallback, Defaults greifen.
- **Auth-Aliase:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — Legacy; NextAuth v5 nutzt `AUTH_SECRET`/`AUTH_URL` (gesetzt). `APP_URL` → `NEXT_PUBLIC_APP_URL` (gesetzt).
- **KI-Tuning-Knöpfe (haben Code-Defaults — nur setzen, um zu überschreiben):** `ASTRA_*`, `ATLAS_CHAT_*`, `ATLAS_V2_*`, `ATLAS_DRAFTING_*`, `ATLAS_EMBED_MODEL`, `GENERATION_MODEL`, `ATLAS_MAX_ORG_DAILY_AI_SPEND_USD`, `*_RETENTION_DAYS`, `ATLAS_STALE_CHAT_DAYS`, diverse `*_ENABLED`-Flags.
- **Test/Build-only:** `VITEST`, `DRY_RUN`, `SKIP_ENV_VALIDATION`, `CI`.
- **Footer-Social-Links:** `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_YOUTUBE_URL`, `NEXT_PUBLIC_MASTODON_URL`, `NEXT_PUBLIC_CRUNCHBASE_URL`, `NEXT_PUBLIC_WIKIDATA_URL`.

## Kürzster Pfad (wenn du Zeit hast)

1. `R2_PUBLIC_URL` → Firm-Logo geht.
2. `UPSTASH_REDIS_REST_URL` + `_TOKEN` → echtes Rate-Limiting.
3. `WEBAUTHN_RP_ID` + `WEBAUTHN_ORIGIN` → Passkeys bombenfest.
4. `SENTRY_DSN` → du siehst Fehler in prod.

Alles andere ist optional / feature-spezifisch / hat Defaults.
