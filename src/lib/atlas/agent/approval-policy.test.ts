/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the agent approval gate. H2: persistent org-level writes
 * (set_org_branding, save_document_template) and sub-agent fan-out
 * (delegate_subtasks) must require approval — previously they were
 * flagged requiresApproval in tool-metadata but the engine's prefix
 * gate let them run autonomously. Reversible drafts (draft_*, refine_*)
 * intentionally stay autonomous.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { requiresApproval, approvalRationale } from "./approval-policy";

describe("requiresApproval — H2 org-write gating", () => {
  it("gates persistent org-level writes", () => {
    expect(requiresApproval("set_org_branding")).toBe(true);
    expect(requiresApproval("save_document_template")).toBe(true);
  });

  it("gates sub-agent fan-out", () => {
    expect(requiresApproval("delegate_subtasks")).toBe(true);
  });

  it("still gates the original dangerous prefixes", () => {
    expect(requiresApproval("create_matter_invite")).toBe(true);
    expect(requiresApproval("send_anything")).toBe(true);
    expect(requiresApproval("schedule_deadline")).toBe(true);
    expect(requiresApproval("finalize_doc")).toBe(true);
  });

  it("leaves reversible drafts + reads autonomous", () => {
    expect(requiresApproval("draft_schriftsatz")).toBe(false);
    expect(requiresApproval("refine_document")).toBe(false);
    expect(requiresApproval("get_org_branding")).toBe(false);
    expect(requiresApproval("use_document_template")).toBe(false);
    expect(requiresApproval("search_legal_sources")).toBe(false);
    expect(requiresApproval("summarize_document")).toBe(false);
  });

  it("gives a specific rationale for the newly-gated tools", () => {
    expect(approvalRationale("set_org_branding")).not.toMatch(/Side-Effects/);
    expect(approvalRationale("save_document_template")).not.toMatch(
      /Side-Effects/,
    );
    expect(approvalRationale("delegate_subtasks")).not.toMatch(/Side-Effects/);
  });
});
