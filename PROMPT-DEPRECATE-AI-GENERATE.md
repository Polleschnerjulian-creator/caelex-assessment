# PROMPT: Deprecate AI Generate → Migrate to Generate 2.0

## Mission

Remove the legacy "AI Generate" document generation feature and consolidate everything into Generate 2.0. ASTRA (the AI chat agent) stays intact — only the document generation path through ASTRA is removed.

**Cost Constraint:** Zero external costs. Only code changes.

**Critical Rule:** Do NOT delete ASTRA chat functionality. ASTRA = chat agent + tool execution + regulatory knowledge. Only the document-generator sub-module is being removed.

---

## What Gets Removed vs. What Stays

### REMOVE (Legacy AI Generate — Document Generation Only)

| Category                      | Files to Remove                                                       | Reason                                                                         |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Document Generator Engine** | `src/lib/astra/document-generator/index.ts`                           | Replaced by `src/lib/generate/index.ts`                                        |
|                               | `src/lib/astra/document-generator/types.ts`                           | Replaced by `src/lib/generate/types.ts`                                        |
|                               | `src/lib/astra/document-generator/prompt-builder.ts`                  | Replaced by `src/lib/generate/prompt-builder.ts`                               |
|                               | `src/lib/astra/document-generator/data-collector.ts`                  | Replaced by `src/lib/generate/data-collector.ts`                               |
|                               | `src/lib/astra/document-generator/content-structurer.ts`              | No equivalent needed                                                           |
| **Document Prompts**          | `src/lib/astra/document-generator/prompts/shared-instructions.ts`     | Replaced by `src/lib/generate/prompts/base-regulatory.ts` + `quality-rules.ts` |
|                               | `src/lib/astra/document-generator/prompts/authorization-package.ts`   | Migrate to Generate 2.0 template                                               |
|                               | `src/lib/astra/document-generator/prompts/cybersecurity-framework.ts` | Covered by `b1-cyber-policy.ts` + `b2-cyber-risk.ts`                           |
|                               | `src/lib/astra/document-generator/prompts/debris-mitigation.ts`       | Covered by `a1-dmp.ts`                                                         |
|                               | `src/lib/astra/document-generator/prompts/environmental-footprint.ts` | Migrate to Generate 2.0 template                                               |
|                               | `src/lib/astra/document-generator/prompts/insurance-compliance.ts`    | Migrate to Generate 2.0 template                                               |
|                               | `src/lib/astra/document-generator/prompts/nis2-assessment.ts`         | Migrate to Generate 2.0 template                                               |
| **Legacy API Routes**         | `src/app/api/documents/generate/route.ts`                             | Replaced by `src/app/api/generate2/documents/route.ts`                         |
|                               | `src/app/api/documents/generate/init/route.ts`                        | Replaced by Generate 2.0 init flow                                             |
|                               | `src/app/api/documents/generate/section/route.ts`                     | Replaced by `generate2/documents/[id]/section/route.ts`                        |
|                               | `src/app/api/documents/generate/complete/route.ts`                    | Replaced by `generate2/documents/[id]/complete/route.ts`                       |
| **Legacy Dashboard Pages**    | `src/app/dashboard/documents/generate/page.tsx`                       | Replaced by `src/app/dashboard/generate/page.tsx`                              |
|                               | `src/app/dashboard/documents/generate/[id]/page.tsx`                  | Replaced by Generate 2.0 detail view                                           |
|                               | `src/app/dashboard/documents/generate/[id]/client.tsx`                | Replaced by Generate 2.0 components                                            |
| **Legacy Components**         | `src/components/documents/DocumentTypeSelector.tsx`                   | Replaced by `generate2/DocumentSelectorPanel.tsx`                              |
|                               | `src/components/documents/GenerationProgress.tsx`                     | Replaced by `generate2/GenerationProgress.tsx`                                 |
|                               | `src/components/documents/DataReviewPanel.tsx`                        | Replaced by `generate2/ContextPanel.tsx`                                       |

### KEEP (ASTRA Chat Agent — NOT Document Generation)

| Category                 | Files to Keep                                        | Reason                                |
| ------------------------ | ---------------------------------------------------- | ------------------------------------- |
| **ASTRA Engine**         | `src/lib/astra/engine.ts`                            | Core chat agent — stays               |
|                          | `src/lib/astra/system-prompt.ts`                     | Chat system prompt — stays            |
|                          | `src/lib/astra/tool-definitions.ts`                  | Tool defs — stays (update below)      |
|                          | `src/lib/astra/tool-executor.ts`                     | Tool execution — stays (update below) |
|                          | `src/lib/astra/response-formatter.ts`                | Chat formatting — stays               |
|                          | `src/lib/astra/conversation-manager.ts`              | Conversation history — stays          |
|                          | `src/lib/astra/context-builder.ts`                   | Context building — stays              |
|                          | `src/lib/astra/article-context.ts`                   | Article lookup — stays                |
|                          | `src/lib/astra/mock-responses.ts`                    | Dev/test — stays                      |
|                          | `src/lib/astra/types.ts`                             | Shared types — stays                  |
| **Regulatory Knowledge** | `src/lib/astra/regulatory-knowledge/*` (all 5 files) | Used by ASTRA chat — stays            |
| **ASTRA Chat API**       | `src/app/api/astra/chat/route.ts`                    | Chat endpoint — stays                 |
| **ASTRA Dashboard**      | `src/app/dashboard/astra/page.tsx`                   | Chat interface — stays                |
| **ASTRA UI Components**  | `src/components/astra/*` (all 14 files)              | Chat UI — stays                       |
| **Landing Page**         | `src/components/landing/AstraSection.tsx`            | Marketing — stays                     |
| **Document Components**  | `src/components/documents/GeneratedDocumentCard.tsx` | May be used by Generate 2.0           |
|                          | `src/components/documents/DocumentStudio.tsx`        | Document editing — keep for now       |
|                          | `src/components/documents/DocumentEditor.tsx`        | Document editing — keep for now       |
|                          | `src/components/documents/DocumentViewer.tsx`        | Document viewing — keep for now       |
|                          | `src/components/documents/SectionRenderer.tsx`       | Section display — keep for now        |
|                          | `src/components/documents/DocumentExportPanel.tsx`   | Export — keep for now                 |
|                          | `src/components/documents/FileUploader.tsx`          | Upload — keep for now                 |

### KEEP (Generate 2.0 — The Replacement)

All files under `src/lib/generate/`, `src/app/api/generate2/`, `src/components/generate2/`, `src/app/dashboard/generate/` stay as-is. These are the replacement.

---

## Step-by-Step Implementation

### Step 1: Migrate Missing Document Types to Generate 2.0

Generate 2.0 currently has 16 NCA document types (8 debris + 8 cybersecurity). But AI Generate had 3 additional types that aren't covered:

1. **Authorization Application** — exists as ASTRA prompt but not as Generate 2.0 template
2. **Environmental Footprint Declaration** — exists as ASTRA prompt but not as Generate 2.0 template
3. **Insurance Compliance Report** — exists as ASTRA prompt but not as Generate 2.0 template

**Create these as new Generate 2.0 templates:**

Create `src/lib/generate/prompts/document-templates/c1-authorization-application.ts`:

```typescript
// Follow the exact same pattern as a1-dmp.ts
// Port the content from src/lib/astra/document-generator/prompts/authorization-package.ts
// Adapt to Generate 2.0's section-based structure
export const authorizationApplicationTemplate = {
  id: "AUTHORIZATION_APPLICATION",
  category: "C", // Category C: General Compliance
  label: "Authorization Application Package",
  description: "Complete authorization application per EU Space Act Art. 4-12",
  sections: [
    { id: "cover_letter", title: "Cover Letter", ... },
    { id: "operator_profile", title: "Operator Profile", ... },
    { id: "mission_description", title: "Mission Description", ... },
    { id: "compliance_summary", title: "Compliance Summary", ... },
    { id: "authorization_checklist", title: "Art. 7 Authorization Checklist", ... },
    { id: "supporting_documents", title: "Supporting Documents Index", ... },
    { id: "certification", title: "Certification Statement", ... },
  ],
};
```

Create `src/lib/generate/prompts/document-templates/c2-environmental-footprint.ts`:

```typescript
// Port from src/lib/astra/document-generator/prompts/environmental-footprint.ts
export const environmentalFootprintTemplate = {
  id: "ENVIRONMENTAL_FOOTPRINT",
  category: "C",
  label: "Environmental Footprint Declaration",
  description: "Environmental impact assessment per EU Space Act Art. 96-100",
  sections: [ ... ],
};
```

Create `src/lib/generate/prompts/document-templates/c3-insurance-compliance.ts`:

```typescript
// Port from src/lib/astra/document-generator/prompts/insurance-compliance.ts
export const insuranceComplianceTemplate = {
  id: "INSURANCE_COMPLIANCE",
  category: "C",
  label: "Insurance Compliance Report",
  description: "Insurance coverage analysis per EU Space Act Art. 44-51",
  sections: [ ... ],
};
```

**Register them in the template index:**

Update `src/lib/generate/prompts/document-templates/index.ts`:

```typescript
import { authorizationApplicationTemplate } from "./c1-authorization-application";
import { environmentalFootprintTemplate } from "./c2-environmental-footprint";
import { insuranceComplianceTemplate } from "./c3-insurance-compliance";

// Add to DOCUMENT_TEMPLATES registry
```

Also update `src/lib/generate/types.ts` to add the new document type IDs to the NCADocumentType enum/union.

### Step 2: Update ASTRA Tool Definitions

In `src/lib/astra/tool-definitions.ts`, find the `generate_authorization_application` tool definition. Update it to call Generate 2.0 instead of the legacy generator:

```typescript
// BEFORE:
{
  name: "generate_authorization_application",
  description: "Triggers generation of an NCA authorization application document...",
  // ... calls legacy document-generator
}

// AFTER:
{
  name: "generate_authorization_application",
  description: "Triggers generation of an NCA authorization application document via Generate 2.0...",
  // ... now calls Generate 2.0 API: POST /api/generate2/documents
  // with documentType: "AUTHORIZATION_APPLICATION"
}
```

Similarly update `src/lib/astra/tool-executor.ts` to route the generation through Generate 2.0's API instead of the old document-generator.

### Step 3: Update Sidebar Navigation

In `src/components/dashboard/Sidebar.tsx`:

1. **Remove** the "AI Generate" navigation item that points to `/dashboard/documents/generate`
2. **Rename** "Generate 2.0" to just "Document Generator" (or "Generate Documents") — the "2.0" branding is no longer needed since there's only one system
3. Keep the path as `/dashboard/generate`

```typescript
// BEFORE:
{ name: "AI Generate", href: "/dashboard/documents/generate", icon: Sparkles, badge: "AI" },
{ name: "Generate 2.0", href: "/dashboard/generate", icon: FileText, badge: "NEW" },

// AFTER:
{ name: "Document Generator", href: "/dashboard/generate", icon: FileText },
```

### Step 4: Add Redirect from Old URL

Create `src/app/dashboard/documents/generate/page.tsx` as a redirect (replaces the old page):

```typescript
import { redirect } from "next/navigation";

export default function LegacyGeneratePage() {
  redirect("/dashboard/generate");
}
```

This ensures any bookmarks or links to the old URL still work.

### Step 5: Update Data Retention Cron

In `src/app/api/cron/data-retention-cleanup/route.ts`, the cleanup job references `GeneratedDocument`. Keep this cleanup running for existing data, but add cleanup for `NCADocument` as well if not already present.

### Step 6: Update i18n Strings

In all translation files (`src/lib/i18n/translations/en.json`, `de.json`, `fr.json`, `es.json`):

- Remove strings referencing "AI Generate"
- Rename "Generate 2.0" strings to "Document Generator"
- Keep any strings that ASTRA chat still uses

### Step 7: Delete Legacy Files

After Steps 1-6 are complete and verified:

```bash
# Delete the document generator module (NOT the rest of astra/)
rm -rf src/lib/astra/document-generator/

# Delete legacy API routes
rm -rf src/app/api/documents/generate/

# Delete legacy dashboard pages (now replaced by redirects)
# Keep the redirect in src/app/dashboard/documents/generate/page.tsx

# Delete legacy-only components
rm src/components/documents/DocumentTypeSelector.tsx
rm src/components/documents/DataReviewPanel.tsx
# Keep: GeneratedDocumentCard, DocumentStudio, DocumentEditor,
#        DocumentViewer, SectionRenderer, DocumentExportPanel, FileUploader
#        (these may still be used elsewhere)
```

### Step 8: Keep GeneratedDocument Prisma Model

Do NOT delete the `GeneratedDocument` model from the schema. Users may have existing generated documents from the legacy system. Keep the model and its API endpoints (`/api/documents/generated/[id]`) so old documents remain accessible. Just remove the ability to CREATE new ones through the legacy path.

Add a comment to the model:

```prisma
/// @deprecated Use NCADocument (Generate 2.0) for new document generation.
/// Retained for backward compatibility with existing generated documents.
model GeneratedDocument {
  // ...existing fields...
}
```

### Step 9: Update Generate 2.0 UI

In `src/components/generate2/Generate2Page.tsx` and related components:

1. Remove any "2.0" or "NEW" badges from the UI
2. Remove any text comparing to "AI Generate" or explaining the difference
3. Update page title from "Generate 2.0" to "Document Generator"
4. Add the 3 new document categories (Authorization, Environmental, Insurance) to the document selector

### Step 10: Verify & Test

```bash
# Type check — must pass with zero errors
npm run typecheck

# Build — must succeed
npm run build

# Test — existing tests must pass
npm run test:run

# Manual verification:
# 1. /dashboard/generate shows all 19 document types (16 NCA + 3 new)
# 2. /dashboard/documents/generate redirects to /dashboard/generate
# 3. ASTRA chat still works at /dashboard/astra
# 4. ASTRA can trigger document generation via Generate 2.0
# 5. Existing GeneratedDocuments are still viewable
# 6. Sidebar shows "Document Generator" without "AI" or "NEW" badges
# 7. No broken imports or 404 pages
```

---

## Quality Checklist

- [ ] All 3 missing document types migrated to Generate 2.0 templates
- [ ] ASTRA tool-definitions.ts updated to call Generate 2.0
- [ ] ASTRA tool-executor.ts updated to route through Generate 2.0
- [ ] Sidebar updated: "AI Generate" removed, "Generate 2.0" renamed to "Document Generator"
- [ ] Redirect from old URL to new URL works
- [ ] Legacy document-generator directory deleted
- [ ] Legacy API routes deleted
- [ ] Legacy dashboard pages replaced with redirects
- [ ] Legacy-only components deleted
- [ ] i18n strings updated across all 4 languages
- [ ] GeneratedDocument model kept (with @deprecated comment) for backward compatibility
- [ ] Data retention cron updated
- [ ] ASTRA chat still fully functional
- [ ] ASTRA landing page section unchanged
- [ ] Zero TypeScript errors
- [ ] Build succeeds
- [ ] All tests pass
