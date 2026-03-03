"use client";

import { useState, useEffect } from "react";
import { Shield, FileCheck, Award, Search, Plus } from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import AttestationGenerator from "./components/attestation-generator";
import AttestationExplainer from "./components/attestation-explainer";
import CertificateList from "./components/certificate-list";
import VerificationWidget from "./components/verification-widget";
import { REGULATION_THRESHOLDS } from "@/lib/verity/evaluation/regulation-thresholds";
import { csrfHeaders } from "@/lib/csrf-client";

interface Satellite {
  noradId: string;
  name: string;
}

export default function VerityDashboard() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [activeTab, setActiveTab] = useState<
    "generate" | "certificates" | "verify"
  >("generate");

  useEffect(() => {
    loadSatellites();
  }, []);

  const loadSatellites = async () => {
    try {
      const res = await fetch("/api/v1/spacecraft", {
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSatellites(
          (data.spacecraft ?? []).map(
            (s: { noradId: string; name: string }) => ({
              noradId: s.noradId,
              name: s.name,
            }),
          ),
        );
      }
    } catch {
      // Silently fail
    }
  };

  const regulations = REGULATION_THRESHOLDS.map((t) => ({
    id: t.id,
    regulation_ref: t.regulation_ref,
    regulation_name: t.regulation_name,
  }));

  const tabs = [
    { id: "generate" as const, label: "Generate Attestation", icon: Shield },
    { id: "certificates" as const, label: "Certificates", icon: Award },
    { id: "verify" as const, label: "Verify", icon: Search },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm font-semibold text-white">Verity</h1>
          <p className="text-body text-white/45 mt-1">
            Privacy-Preserving Compliance Attestation
          </p>
        </div>
        <a
          href="/verity/verify"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 text-small text-white/40 hover:text-white/70 transition-colors"
        >
          <FileCheck className="w-4 h-4" />
          Public Verification
        </a>
      </div>

      {/* Explainer */}
      <AttestationExplainer />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Generate Attestation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttestationGenerator
              satellites={satellites}
              regulations={regulations}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "certificates" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CertificateList />
          </CardContent>
        </Card>
      )}

      {activeTab === "verify" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Verify Attestation or Certificate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationWidget />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
