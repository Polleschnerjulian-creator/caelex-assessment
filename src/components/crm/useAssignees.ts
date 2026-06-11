"use client";

/**
 * Shared client hook for the CRM task-assignee picker (TaskBoard,
 * TasksPanel, TodayPanel). Loads the assignable platform owners +
 * "who am I" once from /api/admin/crm/assignees.
 */

import { useEffect, useState } from "react";

export interface CrmAssignee {
  id: string;
  name: string | null;
  email: string;
}

/** Display name: real name, otherwise the email local part. */
export function assigneeLabel(a: {
  name: string | null;
  email: string;
}): string {
  return a.name?.trim() || a.email.split("@")[0];
}

/** Two-letter initials for the avatar chip ("Niklas Mustermann" → NM). */
export function assigneeInitials(a: {
  name: string | null;
  email: string;
}): string {
  const base = a.name?.trim() || a.email.split("@")[0];
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

interface AssigneesState {
  assignees: CrmAssignee[];
  meId: string | null;
  loaded: boolean;
}

export function useAssignees(): AssigneesState {
  const [state, setState] = useState<AssigneesState>({
    assignees: [],
    meId: null,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/crm/assignees");
        if (!res.ok) throw new Error("assignees fetch failed");
        const data = (await res.json()) as {
          assignees?: CrmAssignee[];
          meId?: string | null;
        };
        if (!cancelled) {
          setState({
            assignees: data.assignees ?? [],
            meId: data.meId ?? null,
            loaded: true,
          });
        }
      } catch {
        if (!cancelled) {
          setState((s) => ({ ...s, loaded: true }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
