"use client";

import { useState, useEffect } from "react";
import CertificateCard from "./certificate-card";
import { csrfHeaders } from "@/lib/csrf-client";

interface CertificateData {
  id: string;
  certificateId: string;
  satelliteNorad: string | null;
  claimsCount: number;
  regulationRefs: string[];
  minTrustLevel: string;
  sentinelBacked: number;
  crossVerified: number;
  isPublic: boolean;
  issuedAt: string;
  expiresAt: string;
  verificationCount: number;
}

export default function CertificateList() {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const res = await fetch("/api/v1/verity/certificate/list", {
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCertificates(data.certificates ?? []);
      }
    } catch {
      // Silently fail — list will be empty
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    try {
      await fetch(`/api/v1/verity/certificate/${id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ isPublic }),
      });
      setCertificates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPublic } : c)),
      );
    } catch {
      // Silently fail
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this certificate? This cannot be undone.")) return;
    try {
      await fetch(`/api/v1/verity/certificate/${id}/revoke`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // Silently fail
    }
  };

  const handleCopy = (certificateId: string) => {
    navigator.clipboard.writeText(certificateId);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-small text-[var(--text-tertiary)]">
          Loading certificates...
        </p>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-8 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl">
        <p className="text-body text-[var(--text-tertiary)]">
          No certificates issued yet
        </p>
        <p className="text-small text-[var(--text-tertiary)] mt-1">
          Generate attestations first, then issue a certificate
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {certificates.map((cert) => (
        <CertificateCard
          key={cert.id}
          cert={cert}
          onTogglePublic={handleTogglePublic}
          onRevoke={handleRevoke}
          onCopy={handleCopy}
        />
      ))}
    </div>
  );
}
