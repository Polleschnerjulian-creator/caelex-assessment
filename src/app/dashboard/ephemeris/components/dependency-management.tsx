"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useEphemerisTheme } from "../theme";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Dependency {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  dependencyType: string;
  strength: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  sourceEntity: { id: string; name: string; operatorType: string };
  targetEntity: { id: string; name: string; operatorType: string };
}

interface EntityOption {
  id: string;
  name: string;
  operatorType: string;
}

const DEPENDENCY_TYPES = [
  "TTC_PROVIDER",
  "LAUNCH_PROVIDER",
  "LAUNCH_SITE",
  "CAPACITY_SOURCE",
  "DATA_SOURCE",
  "SERVICING_TARGET",
  "DATA_PROVIDER",
  "GROUND_NETWORK",
  "INSURANCE_SHARED",
] as const;

const STRENGTH_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const DEP_TYPE_LABELS: Record<string, string> = {
  TTC_PROVIDER: "TT&C Provider",
  LAUNCH_PROVIDER: "Launch Provider",
  LAUNCH_SITE: "Launch Site",
  CAPACITY_SOURCE: "Capacity Source",
  DATA_SOURCE: "Data Source",
  SERVICING_TARGET: "Servicing Target",
  DATA_PROVIDER: "Data Provider",
  GROUND_NETWORK: "Ground Network",
  INSURANCE_SHARED: "Shared Insurance",
};

const STRENGTH_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F59E0B",
  MEDIUM: "#3B82F6",
  LOW: "#6B7280",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface DependencyManagementProps {
  entityId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DependencyManagement({
  entityId,
}: DependencyManagementProps) {
  const COLORS = useEphemerisTheme();
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetectResult, setAutoDetectResult] = useState<string | null>(null);

  // Add form state
  const [newDep, setNewDep] = useState({
    targetEntityId: "",
    dependencyType: "TTC_PROVIDER" as string,
    strength: "HIGH" as string,
    description: "",
  });

  const sans = { fontFamily: '"Inter", -apple-system, sans-serif' };
  const mono = { fontFamily: '"IBM Plex Mono", "Fira Code", monospace' };

  const loadDependencies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/ephemeris/dependencies?sourceEntityId=${entityId}`,
        { headers: csrfHeaders() },
      );
      if (res.ok) {
        const json = await res.json();
        setDependencies(json.data ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  const loadEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ephemeris/fleet", {
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? [];
        setEntities(
          data.map(
            (e: {
              noradId: string;
              satelliteName: string;
              operatorType?: string;
            }) => ({
              id: e.noradId,
              name: e.satelliteName,
              operatorType: e.operatorType ?? "SCO",
            }),
          ),
        );
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadDependencies();
    loadEntities();
  }, [loadDependencies, loadEntities]);

  const handleAdd = async () => {
    if (!newDep.targetEntityId) return;

    try {
      const res = await fetch("/api/v1/ephemeris/dependencies", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityId: entityId,
          targetEntityId: newDep.targetEntityId,
          dependencyType: newDep.dependencyType,
          strength: newDep.strength,
          description: newDep.description || undefined,
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setNewDep({
          targetEntityId: "",
          dependencyType: "TTC_PROVIDER",
          strength: "HIGH",
          description: "",
        });
        loadDependencies();
      }
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (depId: string) => {
    try {
      const res = await fetch(`/api/v1/ephemeris/dependencies/${depId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        loadDependencies();
      }
    } catch {
      // Silently fail
    }
  };

  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    setAutoDetectResult(null);
    try {
      const res = await fetch("/api/v1/ephemeris/dependencies/auto-detect", {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setAutoDetectResult(
          `Detected ${json.data.detected} dependencies, created ${json.data.created} new.`,
        );
        loadDependencies();
      } else {
        setAutoDetectResult("Auto-detection failed.");
      }
    } catch {
      setAutoDetectResult("Network error.");
    } finally {
      setAutoDetecting(false);
    }
  };

  return (
    <div
      style={{
        background: COLORS.elevated,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 4,
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            ...sans,
          }}
        >
          Entity Dependencies
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleAutoDetect}
            disabled={autoDetecting}
            style={{
              padding: "4px 10px",
              fontSize: 10,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 3,
              background: COLORS.sunken,
              color: COLORS.textSecondary,
              cursor: autoDetecting ? "wait" : "pointer",
              ...sans,
            }}
          >
            {autoDetecting ? "Detecting..." : "Auto-Detect"}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "4px 10px",
              fontSize: 10,
              border: `1px solid ${COLORS.brand}`,
              borderRadius: 3,
              background: showAddForm ? COLORS.brand : "transparent",
              color: showAddForm ? "#fff" : COLORS.brand,
              cursor: "pointer",
              ...sans,
            }}
          >
            {showAddForm ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Auto-detect result */}
      {autoDetectResult && (
        <div
          style={{
            padding: "6px 12px",
            fontSize: 10,
            color: COLORS.textSecondary,
            background: `${COLORS.accent}10`,
            border: `1px solid ${COLORS.accent}30`,
            borderRadius: 3,
            marginBottom: 12,
            ...sans,
          }}
        >
          {autoDetectResult}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div
          style={{
            padding: 12,
            background: COLORS.sunken,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            marginBottom: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 9,
                color: COLORS.textMuted,
                display: "block",
                marginBottom: 4,
                ...sans,
              }}
            >
              Target Entity
            </label>
            <select
              value={newDep.targetEntityId}
              onChange={(e) =>
                setNewDep({ ...newDep, targetEntityId: e.target.value })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 10,
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                color: COLORS.textPrimary,
                ...sans,
              }}
            >
              <option value="">Select entity...</option>
              {entities
                .filter((e) => e.id !== entityId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.operatorType})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 9,
                color: COLORS.textMuted,
                display: "block",
                marginBottom: 4,
                ...sans,
              }}
            >
              Type
            </label>
            <select
              value={newDep.dependencyType}
              onChange={(e) =>
                setNewDep({ ...newDep, dependencyType: e.target.value })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 10,
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                color: COLORS.textPrimary,
                ...sans,
              }}
            >
              {DEPENDENCY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DEP_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 9,
                color: COLORS.textMuted,
                display: "block",
                marginBottom: 4,
                ...sans,
              }}
            >
              Strength
            </label>
            <select
              value={newDep.strength}
              onChange={(e) =>
                setNewDep({ ...newDep, strength: e.target.value })
              }
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 10,
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                color: COLORS.textPrimary,
                ...sans,
              }}
            >
              {STRENGTH_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 9,
                color: COLORS.textMuted,
                display: "block",
                marginBottom: 4,
                ...sans,
              }}
            >
              Description
            </label>
            <input
              type="text"
              value={newDep.description}
              onChange={(e) =>
                setNewDep({ ...newDep, description: e.target.value })
              }
              placeholder="Optional description..."
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 10,
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                color: COLORS.textPrimary,
                ...sans,
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button
              onClick={handleAdd}
              disabled={!newDep.targetEntityId}
              style={{
                padding: "4px 16px",
                fontSize: 10,
                background: COLORS.brand,
                color: "#fff",
                border: "none",
                borderRadius: 3,
                cursor: newDep.targetEntityId ? "pointer" : "not-allowed",
                opacity: newDep.targetEntityId ? 1 : 0.5,
                ...sans,
              }}
            >
              Create Dependency
            </button>
          </div>
        </div>
      )}

      {/* Dependencies list */}
      {loading ? (
        <div
          style={{
            padding: 16,
            textAlign: "center",
            color: COLORS.textMuted,
            ...sans,
          }}
        >
          Loading...
        </div>
      ) : dependencies.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: COLORS.textMuted,
            fontSize: 11,
            ...sans,
          }}
        >
          No dependencies configured. Use &quot;Auto-Detect&quot; or &quot;+
          Add&quot; to create dependencies.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: COLORS.sunken,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
              }}
            >
              {/* Strength indicator */}
              <div
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  background: STRENGTH_COLORS[dep.strength] ?? COLORS.textMuted,
                }}
              />

              {/* Source → Target */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.textPrimary,
                    fontWeight: 500,
                    ...sans,
                  }}
                >
                  {dep.sourceEntity?.name ?? entityId} →{" "}
                  {dep.targetEntity?.name ?? dep.targetEntityId}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: COLORS.textTertiary,
                    marginTop: 2,
                    ...sans,
                  }}
                >
                  {DEP_TYPE_LABELS[dep.dependencyType] ?? dep.dependencyType} ·{" "}
                  {dep.strength}
                  {dep.description ? ` · ${dep.description}` : ""}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(dep.id)}
                style={{
                  padding: "2px 8px",
                  fontSize: 9,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 3,
                  background: "transparent",
                  color: COLORS.textMuted,
                  cursor: "pointer",
                  ...sans,
                }}
                title="Remove dependency"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
