# Pilot Side-Letter Template — Caelex

> **Purpose.** This side-letter sits on top of the standard contract stack
> (Terms V3.0 + DPA V1.0 + Privacy Policy V3.0 + AI Disclosure V2.0)
> for early-pilot or sensitive-mandate customers who need stricter
> commitments than the published baseline. It is **not a public document**
> — it is exchanged in dual-signed PDF form between Caelex and the
> Customer at engagement start.
>
> Closes audit-finding #9 (Pilot Side-Letter draft).
>
> **How to use.** Strip placeholders (`[…]`), fill in the customer-specific
> blanks, redline negotiated changes, sign + counter-sign, store in the
> Customer's Legal-Network workspace AND in Caelex's `data-room/contracts/
pilots/<customer-slug>/`. The next standard-contract revision should
> review whether any side-letter clause has become baseline behaviour and
> deserves promotion into the public DPA/Terms.

---

## SIDE-LETTER TO MASTER SERVICE AGREEMENT

**between**

**Caelex** (sole proprietorship of Julian Polleschner)
Am Maselakepark 37, 13587 Berlin, Germany
(the **"Provider"**)

**and**

**[Customer Legal Name]**
[Customer Address]
[Registration / VAT-ID]
(the **"Customer"**)

(jointly the **"Parties"**)

**Effective date:** [DD Month YYYY]
**Master agreement reference:** Caelex Terms V3.0 + DPA V1.0
(both available at caelex.eu/legal, hereinafter the "Standard Stack")
**Engagement scope:** [pilot / sensitive-mandate / regulated-industry]

---

### 1. Purpose and precedence

1.1 This Side-Letter modifies the Standard Stack for the duration of the
Customer's engagement under [Order Form / SOW / engagement reference].
For the avoidance of doubt: where this Side-Letter conflicts with the
Standard Stack, this Side-Letter prevails for the Customer.

1.2 All terms not modified here remain in full force as published in the
Standard Stack.

1.3 The Provider may not assign or modify this Side-Letter without the
Customer's prior written consent.

---

### 2. AI-routing data-residency lock-in

> _Standard-Stack baseline:_ `/legal/dpa § 5(5)` allows USA fallback under
> DPF + SCC if the EU-Bedrock path is unavailable. This clause removes
> that fallback for the Customer's data.

2.1 **EU-only routing.** All Anthropic-Claude inference calls processing
the Customer's organisation data shall route exclusively via the Vercel
AI Gateway to AWS Bedrock in the European Union (eu-central-1 Frankfurt
or eu-west-1 Ireland). No fallback to the direct Anthropic-USA API path
(as defined in `src/lib/atlas/anthropic-client.ts`) is permitted for the
Customer's data.

2.2 **Operational consequence.** If the EU-Bedrock path is unavailable,
the Provider shall return a structured error to the Customer's interface
rather than fall through to the USA path. The Provider shall maintain
runbook procedures for monitoring EU-Bedrock availability.

2.3 **Embeddings.** The OpenAI embedding sub-sub-processor (currently
`text-embedding-3-small @ 512 dimensions` via Vercel AI Gateway) shall
be either (a) replaced with an EU-region embedding provider when
available, or (b) excluded entirely for the Customer's data. The Parties
shall document which option applies in Annex A.

2.4 **Telemetry.** The Provider shall log the routing path used for each
inference call and make these logs available to the Customer on written
request under Art. 28(3)(h) GDPR.

---

### 3. Custom data retention

> _Standard-Stack baseline:_ `/legal/privacy § 3(3)` defines table-by-
> table retention. This clause overrides specific retention windows for
> the Customer.

3.1 **Astra conversations** (in lieu of the 6-month rolling window): the
Customer's Astra conversations shall be retained for **[X months]** from
last activity, then deleted. The data-retention-cleanup cron is
configured to honour this override via the Customer's organisation flag.

3.2 **Audit trail** (in lieu of "up to 7 years"): the Customer may
request earlier deletion of pseudonymised audit-log entries after
**[Y years]** subject to no pending statutory retention obligation
(steuer- / handelsrechtliche Aufbewahrung) attaching to the underlying
event.

3.3 **Compliance content** (in lieu of "30 days post-termination"): the
Customer may extend the post-termination export window to **[Z days]**
on written request.

3.4 The Parties shall maintain a written change log of any retention
override granted under this clause and review it annually.

---

### 4. Restricted administrative-access regime

> _Standard-Stack baseline:_ `/legal/privacy § 5(2)` discloses
> platform-owner cross-tenant administrative read-access. This clause
> further restricts that access for the Customer.

4.1 **Named-individual restriction.** Cross-tenant administrative
scope-resolution into the Customer's organisation shall be permitted only
for the named individuals listed in Annex B ("Authorised Operators"),
which shall be a strict subset of the platform-owner allowlist.

4.2 **Pre-notification trigger.** Where time-sensitive operational
necessity allows, the Provider shall notify the Customer's named contact
via email **before** any cross-tenant scope-resolution. Where time-
sensitivity does not allow, notification shall follow within 24 hours.

4.3 **Audit access.** The Customer shall have read access to the
`super_admin_cross_tenant_access` entries in the tamper-evident audit
chain for its organisation, on written request and at no charge.

4.4 **Exclusions.** This clause does not restrict access required by
binding statutory obligation (e.g. § 100b TKG, § 113 TKG, judicial
production orders); in such cases the Provider shall comply but inform
the Customer where lawfully permitted.

---

### 5. Sub-processor lock-in

> _Standard-Stack baseline:_ `/legal/dpa § 9` allows 30-day prior notice
> of sub-processor changes. This clause introduces named lock-in for the
> Customer's most-sensitive data flows.

5.1 The Customer's organisation data shall be processed only by the
specific sub-processors listed at the Effective Date in
caelex.eu/legal/sub-processors. The Provider shall give the Customer
**[60] days'** prior written notice (in lieu of the 30-day baseline) of
any change.

5.2 The Customer shall have the right to object on substantive grounds
(e.g. data-protection or competitive concern). On objection, the Parties
shall negotiate in good faith for a period of **[30] days**. If no
agreement is reached, the Customer may terminate without cause and
without penalty effective on the change date and is entitled to a pro-
rata refund.

---

### 6. Service-level supplements

6.1 **Uptime target** (in lieu of the published target): **[X.YY]%** per
calendar month, measured per the Provider's status page.

6.2 **Incident response.** Critical incidents (priority "Critical" per
the Provider's incident-classification policy) shall receive an initial
acknowledgement within **[Z minutes]** during the Customer's named
business hours.

6.3 **Service credits.** Failure to meet the uptime target shall entitle
the Customer to a service credit of **[N]%** of the monthly fee per full
percentage-point shortfall, capped at **[M]%**.

---

### 7. Liability cap supplement

7.1 The Customer-specific liability cap is **[EUR / USD] [amount]** per
calendar year (in lieu of the published cap in Terms § 26), applicable
to claims arising under or in connection with this engagement.

7.2 This supplement does not affect liability for damages caused
intentionally or by gross negligence, nor for breach of express
warranties, nor for any liability that cannot be excluded by mandatory
law (Art. 82 GDPR, Produkthaftungsgesetz, etc.).

---

### 8. Termination and exit

8.1 The Customer may terminate this Side-Letter (and the underlying
engagement) without cause on **[60] days'** written notice. The
underlying Standard Stack survives this termination unless separately
terminated.

8.2 On termination, the Provider shall provide a structured machine-
readable export of the Customer's data within **[14] days** (in lieu of
the 30-day baseline) and confirm deletion in writing within **[30] days**
thereafter, subject to statutory retention obligations.

---

### 9. Confidentiality of this Side-Letter

9.1 The terms of this Side-Letter (but not its existence) are confidential
and shall not be disclosed by either Party other than to its legal,
financial and tax advisors under duty of confidentiality, or where
required by law.

9.2 The Customer may name Caelex as a customer in marketing
communications; the specific terms of this Side-Letter shall not be so
disclosed.

---

### 10. General

10.1 **Governing law:** German law, Berlin venue (matching Terms § 30).

10.2 **Severability:** If any clause is found invalid, the rest remains
in force; the Parties shall replace the invalid clause with one that
approximates the original commercial intent as closely as legally
possible.

10.3 **No oral modification:** modifications must be in writing
(electronic signatures suffice) and signed by both Parties.

10.4 **Entire agreement:** the Standard Stack, this Side-Letter and the
Annexes constitute the entire agreement; prior representations are
superseded.

---

### Signatures

**Caelex** (sole proprietorship of Julian Polleschner)

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
Julian Polleschner — Owner
Date: \_\_\_\_\_\_\_\_\_\_

**[Customer Legal Name]**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
[Name, Title]
Date: \_\_\_\_\_\_\_\_\_\_

---

### Annex A — Embedding-provider configuration

| Item                                   | Configuration                                                            |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Active embedding provider for Customer | [`OpenAI text-embedding-3-small` / `EU-region alternative` / `disabled`] |
| Routing                                | [`Vercel AI Gateway → OpenAI USA` / `EU alternative`]                    |
| Effective until                        | [date or "until further notice"]                                         |

### Annex B — Authorised cross-tenant operators

| Email             | Role                                   | Effective from |
| ----------------- | -------------------------------------- | -------------- |
| [email@caelex.eu] | [Platform Owner / Designated Engineer] | [date]         |
| [email@caelex.eu] | [Platform Owner / Designated Engineer] | [date]         |

> The list above is a strict subset of `src/lib/super-admin.ts`. Removal
> from this list precedes any administrative-access by the named
> individual to the Customer's data; revocation takes effect immediately
> upon written notice.

### Annex C — Retention overrides

| Data category                  | Standard retention | Customer retention | Effective from |
| ------------------------------ | ------------------ | ------------------ | -------------- |
| Astra conversations            | 6 months rolling   | [X months]         | [date]         |
| Audit-trail entries            | up to 7 years      | [Y years]          | [date]         |
| Post-termination export window | 30 days            | [Z days]           | [date]         |

### Annex D — Service-level supplements (optional)

| Item                   | Standard   | Customer-specific  |
| ---------------------- | ---------- | ------------------ |
| Uptime target          | [baseline] | [X.YY]%            |
| Critical-incident ack  | [baseline] | [Z minutes]        |
| Service-credit formula | none       | [as in clause 6.3] |
