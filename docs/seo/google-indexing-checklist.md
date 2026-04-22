# Google Indexing + Knowledge Panel — External Actions Checklist

> **Purpose.** The code-side GEO work (Phases 1–4 + this commit) gives
> crawlers everything they need to index and cite Caelex well. What's
> left is a set of external actions nobody can automate for you — each
> of them is free, each takes 5–20 minutes, and together they resolve
> the "Caelex doesn't show up when I google it" problem.
>
> Status as of 2026-04-22: none of the items below are done. Work
> through them top-to-bottom — they're ordered by impact per minute
> of effort.

---

## 1. Google Search Console (CRITICAL — single biggest blocker)

Without Search Console, Google treats caelex.eu as any other new
domain — low crawl priority, no index-coverage feedback, no
request-indexing button. This is the **one** external step that
most directly unblocks "Caelex doesn't show up on Google."

**Steps (≈ 10 min):**

1. Go to https://search.google.com/search-console
2. Click **Add property** → choose **URL prefix** → enter
   `https://caelex.eu`
3. Verify via **HTML tag** method:
   - Google shows a snippet like
     `<meta name="google-site-verification" content="abc123..." />`
   - Copy only the `content` value (e.g. `abc123...`)
   - In Vercel → Project → Settings → Environment Variables:
     - Key: `SEARCH_CONSOLE_GOOGLE`
     - Value: `abc123...`
     - Environments: Production, Preview, Development
   - Redeploy (or let the next push redeploy automatically)
   - In Search Console, click **Verify**

4. Once verified:
   - **Sitemaps** → submit `https://caelex.eu/sitemap.xml`
   - **URL Inspection** → paste `https://caelex.eu/` → **Request
     Indexing** (repeat for `/what-is-caelex`, `/platform`,
     `/resources/eu-space-act`, `/for/satellite-operators`,
     `/compare/spreadsheet-compliance` — the pages you most want
     ranked for brand + long-tail queries)

5. Expect it to take 2–14 days before index-coverage results appear.

---

## 2. Bing Webmaster Tools (same pattern, 15 % of EU search)

Bing powers Bing Search + Microsoft Copilot + DuckDuckGo's
fallback index. Submitting here is independent of Google.

**Steps (≈ 8 min):**

1. Go to https://www.bing.com/webmasters
2. Sign in with a Microsoft account
3. Click **Add a site** → enter `https://caelex.eu`
4. Verify via **HTML Meta Tag** method:
   - Bing shows a snippet with `name="msvalidate.01" content="..."`
   - Copy the content value
   - In Vercel env: `SEARCH_CONSOLE_BING=<content value>`
   - Redeploy, return to Bing, click **Verify**
5. Submit the sitemap: **Sitemaps** → `https://caelex.eu/sitemap.xml`

Bonus: Bing Webmaster Tools lets you import a property directly
from Google Search Console once both are verified — saves the
sitemap-submission step.

---

## 3. IndexNow (free, Bing + Yandex + Seznam + Naver + Yep)

IndexNow is a protocol where sites POST "this URL changed" to a
shared API; participating search engines crawl within minutes
instead of days. Caelex already has the endpoint (`/api/indexnow`)
and a rewrite for the Bing-expected key file — activation is one
env variable.

**Steps (≈ 3 min):**

1. Generate a random key (any 8–128 char hex/alphanumeric):
   ```
   openssl rand -hex 16
   ```
2. Vercel env: `INDEXNOW_KEY=<that random string>`
3. (Optional hardening) Generate a second secret for auth:
   ```
   openssl rand -hex 32
   ```
   and set `INDEXNOW_PUSH_SECRET=<second secret>` — future cron
   jobs or CI pushes must send that value in the `X-IndexNow-Auth`
   header.
4. Redeploy.
5. Verify:
   - `https://caelex.eu/<INDEXNOW_KEY>.txt` should return the key
     as plaintext
   - Register the site at https://www.indexnow.org (optional but
     recommended)

---

## 4. Wikidata entry (THE Knowledge Panel trigger)

The knowledge panel on the right of Google search results is fed
by Google's Knowledge Graph. Knowledge Graph is in turn fed most
aggressively by **Wikidata** + **Wikipedia**. Creating a Wikidata
entry is the single highest-leverage move for getting a knowledge
panel.

**Steps (≈ 20 min):**

1. Create an account at https://www.wikidata.org (if you don't
   have one)
2. Click **Create a new Item** (top-right menu)
3. Fill in:
   - **Label (English):** Caelex
   - **Label (German):** Caelex
   - **Description (English):** German software company making
     regulatory compliance software for space operators
   - **Description (German):** deutsches
     Softwareunternehmen für Raumfahrt-Regulierungs-Compliance
4. Add statements (use the **+ add statement** button):
   - `instance of (P31)` → `enterprise (Q6881511)`
   - `country (P17)` → `Germany (Q183)`
   - `headquarters location (P159)` → `Berlin (Q64)`
   - `inception (P571)` → `2025`
   - `official website (P856)` → `https://caelex.eu`
   - `industry (P452)` → `software industry (Q880991)` and
     `aerospace industry (Q205776)`
5. Save. Note the Q-number at the top of the entry
   (e.g. `Q132934567`)
6. Vercel env: `NEXT_PUBLIC_WIKIDATA_URL=https://www.wikidata.org/wiki/Q132934567`
7. Redeploy — this adds the Wikidata URL to the Organization
   JSON-LD's `sameAs`, closing the loop.

Expect 2–8 weeks for Google to pull the Wikidata entry into its
Knowledge Graph.

---

## 5. LinkedIn Company Page completion

If the LinkedIn page at https://linkedin.com/company/caelex exists,
make sure:

- **About** section is filled out and matches the Wikidata entry
  description (Google cross-checks consistency)
- **Headquarters**: Berlin, Germany
- **Year founded**: 2025
- **Industry**: Software Development
- **Website**: `https://caelex.eu`
- Logo + cover image uploaded
- Regular posting cadence — even one post per week signals "active
  company" to Google's Knowledge Graph curators

If the page doesn't exist yet, create it at
https://www.linkedin.com/company/setup/new/ first — LinkedIn is
the #1 sameAs signal after Wikidata.

---

## 6. Crunchbase profile (high-authority sameAs)

Crunchbase is another Knowledge-Graph-fed authority. Free tier is
enough.

**Steps:**

1. Claim or create an organization profile at https://www.crunchbase.com
   (or use an adjacent-profile request form if the name is taken)
2. Fill in: founding year 2025, headquarters Berlin, industries
   (SaaS, Aerospace, Compliance, Space Industry)
3. Vercel env: `NEXT_PUBLIC_CRUNCHBASE_URL=https://www.crunchbase.com/organization/caelex`

---

## 7. YouTube + other profile slots (optional — each adds a sameAs)

Caelex's Organization JSON-LD includes ENV-gated slots for
`NEXT_PUBLIC_YOUTUBE_URL`, `NEXT_PUBLIC_GITHUB_URL`, and
`NEXT_PUBLIC_MASTODON_URL`. If a Caelex presence exists on any
of those (or once one is created), set the env variable and a
redeploy adds it to the Knowledge-Graph signal.

---

## 8. First backlinks — the one thing that actually needs a human

Google's brand-query ranking is substantially gated by whether
_other_ sites link to caelex.eu. The fastest cheap sources for a
B2B SaaS in 2026:

- **Crunchbase** (covered above) — one high-authority backlink
- **Directories** that actually get crawled: G2 (free profile),
  Gartner Digital Markets, Capterra, Product Hunt launch,
  AlternativeTo
- **Industry presence**: SpaceNews, Via Satellite, European
  Spaceflight, Advanced Television — press release or single
  mention in a roundup is enough seed
- **GitHub** — if there's any public Caelex tooling / SDK / open
  data release, a README linking to caelex.eu is a solid
  dev-community signal
- **LinkedIn** — company-page posts that link to /blog posts
  create indirect linkback pressure when reshared

**Minimum to unblock brand-query ranking:** 3–5 of the above,
spread over 4–6 weeks. All free.

---

## 9. Check progress

After doing items 1–3 above, you'll have feedback loops:

- **Google Search Console** → Performance tab → look for
  impressions on queries containing "caelex". Impressions appear
  before clicks; impressions without clicks is the "we show up
  but not yet for brand" phase.
- **Google Search Console** → Coverage tab → look for
  `/what-is-caelex`, `/resources/eu-space-act`, etc. moving to
  **Valid** status.
- **Bing Webmaster Tools** → Site Explorer → check indexed count.
  Bing is usually faster than Google at index coverage (7–14
  days vs 14–30).

---

## ENV variable reference

All ENV variables the code relies on:

| Variable                     | Purpose                             | Example                                          |
| ---------------------------- | ----------------------------------- | ------------------------------------------------ |
| `SEARCH_CONSOLE_GOOGLE`      | Google Search Console verification  | `abc123def456...`                                |
| `SEARCH_CONSOLE_BING`        | Bing Webmaster Tools verification   | `XYZ789...`                                      |
| `SEARCH_CONSOLE_YANDEX`      | Yandex Webmaster verification       | `verification-code`                              |
| `INDEXNOW_KEY`               | IndexNow key for Bing/Yandex push   | 16-byte hex                                      |
| `INDEXNOW_PUSH_SECRET`       | (Optional) Machine-auth on push API | 32-byte hex                                      |
| `NEXT_PUBLIC_WIKIDATA_URL`   | Wikidata entry URL                  | `https://www.wikidata.org/wiki/Q...`             |
| `NEXT_PUBLIC_CRUNCHBASE_URL` | Crunchbase org URL                  | `https://www.crunchbase.com/organization/caelex` |
| `NEXT_PUBLIC_YOUTUBE_URL`    | YouTube channel                     | `https://youtube.com/@caelex`                    |
| `NEXT_PUBLIC_GITHUB_URL`     | GitHub org                          | `https://github.com/caelex`                      |
| `NEXT_PUBLIC_MASTODON_URL`   | Fediverse presence                  | `https://mastodon.social/@caelex`                |

All are optional in the sense that the code handles their absence
cleanly — but Google Search Console + Bing Webmaster Tools are
the minimum to fix the "Caelex doesn't show on Google" issue.

---

## Timeline expectations

| Step                                               | Typical time to visible effect           |
| -------------------------------------------------- | ---------------------------------------- |
| Google Search Console verified + sitemap submitted | 7–30 days to see index coverage          |
| Bing Webmaster Tools + sitemap                     | 7–14 days                                |
| IndexNow push                                      | Minutes to hours for individual URLs     |
| Wikidata entry                                     | 2–8 weeks to flow into Knowledge Graph   |
| LinkedIn + Crunchbase profile completion           | 1–3 weeks contributing to entity signals |
| First backlinks                                    | 2–6 weeks depending on source authority  |

Brand-query ranking ("caelex" shows Caelex as first result)
typically takes 4–12 weeks after items 1–4 are in place.
Knowledge Panel (right-hand context card) typically 8–20 weeks
after item 4 is processed by Google's Knowledge Graph.
