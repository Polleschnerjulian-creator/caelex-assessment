"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { csrfHeaders } from "@/lib/csrf-client";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Building2,
  FileText,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Check,
  ExternalLink,
  Plus,
  Shield,
  Download,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  nationalAuthorities,
  incidentCategories,
  reportingObligations,
  calendarEventTypes,
} from "@/data/national-authorities";
import type { NationalAuthority } from "@/data/national-authorities";

type Step = "nca" | "reporting" | "incidents" | "calendar";

interface SupervisionConfig {
  id: string;
  primaryCountry: string;
  additionalCountries: string[];
  designatedContactName: string | null;
  designatedContactEmail: string | null;
  designatedContactPhone: string | null;
  designatedContactRole: string | null;
  communicationLanguage: string;
  notificationMethod: string;
  primaryNCA?: NationalAuthority;
}

interface Incident {
  id: string;
  incidentNumber: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  detectedAt: string;
  detectedBy: string;
  reportedToNCA: boolean;
}

interface CalendarEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
}

const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "nca", label: "NCA Configuration", icon: <Building2 size={18} /> },
  { id: "reporting", label: "Reporting Setup", icon: <FileText size={18} /> },
  {
    id: "incidents",
    label: "Incident Management",
    icon: <AlertTriangle size={18} />,
  },
  {
    id: "calendar",
    label: "Compliance Calendar",
    icon: <Calendar size={18} />,
  },
];

function SupervisionPageContent() {
  const [activeStep, setActiveStep] = useState<Step>("nca");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SupervisionConfig | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState({
    totalIncidents: 0,
    openIncidents: 0,
    pendingReports: 0,
    upcomingEvents: 0,
  });

  // Form state for NCA config
  const [formData, setFormData] = useState({
    primaryCountry: "",
    additionalCountries: [] as string[],
    designatedContactName: "",
    designatedContactEmail: "",
    designatedContactPhone: "",
    designatedContactRole: "",
    communicationLanguage: "en",
    notificationMethod: "email",
  });

  // Incident form state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    category: "",
    severity: "medium",
    title: "",
    description: "",
    detectedAt: new Date().toISOString().slice(0, 16),
    detectedBy: "",
    detectionMethod: "manual",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, incidentsRes, calendarRes] = await Promise.all([
        fetch("/api/supervision"),
        fetch("/api/supervision/incidents?limit=10"),
        fetch("/api/supervision/calendar?status=upcoming"),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        if (data.configured) {
          setConfig(data.config);
          setStats(data.stats);
          setFormData({
            primaryCountry: data.config.primaryCountry,
            additionalCountries: data.config.additionalCountries || [],
            designatedContactName: data.config.designatedContactName || "",
            designatedContactEmail: data.config.designatedContactEmail || "",
            designatedContactPhone: data.config.designatedContactPhone || "",
            designatedContactRole: data.config.designatedContactRole || "",
            communicationLanguage: data.config.communicationLanguage || "en",
            notificationMethod: data.config.notificationMethod || "email",
          });
        }
      }

      if (incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents || []);
      }

      if (calendarRes.ok) {
        const data = await calendarRes.json();
        setCalendarEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching supervision data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig({
          ...data.config,
          primaryNCA: nationalAuthorities[formData.primaryCountry],
        });
        setActiveStep("reporting");
      }
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setSaving(false);
    }
  };

  const createIncident = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/supervision/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(incidentForm),
      });

      if (res.ok) {
        setShowIncidentForm(false);
        setIncidentForm({
          category: "",
          severity: "medium",
          title: "",
          description: "",
          detectedAt: new Date().toISOString().slice(0, 16),
          detectedBy: "",
          detectionMethod: "manual",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error creating incident:", error);
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-500/10";
      case "high":
        return "text-orange-400 bg-orange-500/10";
      case "medium":
        return "text-amber-400 bg-amber-500/10";
      case "low":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-slate-500 dark:text-white/60 bg-slate-100 dark:bg-white/5";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "detected":
        return "text-red-400 bg-red-500/10";
      case "investigating":
        return "text-orange-400 bg-orange-500/10";
      case "contained":
        return "text-amber-400 bg-amber-500/10";
      case "resolved":
        return "text-emerald-400 bg-emerald-500/10";
      case "reported":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-slate-500 dark:text-white/60 bg-slate-100 dark:bg-white/5";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-100 dark:bg-white/5 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500 dark:text-white/60 mb-2">
          MODULE 07
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Supervision & Reporting
        </h1>
        <p className="text-slate-600 dark:text-slate-500 dark:text-white/60 mt-1">
          Manage NCA relationships, incidents, and compliance reporting
        </p>
      </div>

      {/* Stats Cards */}
      {config && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {config.primaryNCA?.countryCode || config.primaryCountry}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Primary NCA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stats.openIncidents}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Open Incidents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FileText size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stats.pendingReports}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Pending Reports
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Calendar size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stats.upcomingEvents}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Upcoming Events
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex items-center gap-2 p-1 bg-white dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all
              ${
                activeStep === step.id
                  ? "bg-slate-200 dark:bg-white/10 text-white"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:bg-white/5"
              }
            `}
          >
            <span
              className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs
              ${activeStep === step.id ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70"}
            `}
            >
              {config && index < steps.findIndex((s) => s.id === activeStep) ? (
                <Check size={12} />
              ) : (
                index + 1
              )}
            </span>
            <span className="hidden md:inline">{step.label}</span>
            {step.icon}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: NCA Configuration */}
          {activeStep === "nca" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={20} />
                  National Competent Authority Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary NCA Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                    Primary Registration Country *
                  </label>
                  <select
                    value={formData.primaryCountry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryCountry: e.target.value,
                      })
                    }
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select country...</option>
                    {Object.values(nationalAuthorities)
                      .filter((nca) => nca.isEUMember)
                      .sort((a, b) =>
                        a.countryName.localeCompare(b.countryName),
                      )
                      .map((nca) => (
                        <option key={nca.countryCode} value={nca.countryCode}>
                          {nca.countryName} - {nca.authorityName}
                        </option>
                      ))}
                  </select>
                </div>

                {/* NCA Details */}
                {formData.primaryCountry &&
                  nationalAuthorities[formData.primaryCountry] && (
                    <div className="bg-white dark:bg-white/[0.02] rounded-lg p-4 border border-slate-200 dark:border-white/5">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-3">
                        {
                          nationalAuthorities[formData.primaryCountry]
                            .authorityName
                        }
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-white/50">
                            Local Name
                          </p>
                          <p className="text-slate-700 dark:text-white/80">
                            {
                              nationalAuthorities[formData.primaryCountry]
                                .authorityNameLocal
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-white/50">
                            Contact Email
                          </p>
                          <p className="text-slate-700 dark:text-white/80">
                            {
                              nationalAuthorities[formData.primaryCountry]
                                .contactEmail
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-white/50">
                            Phone
                          </p>
                          <p className="text-slate-700 dark:text-white/80">
                            {
                              nationalAuthorities[formData.primaryCountry]
                                .contactPhone
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-white/50">
                            Regulatory Framework
                          </p>
                          <p className="text-slate-700 dark:text-white/80">
                            {
                              nationalAuthorities[formData.primaryCountry]
                                .regulatoryFramework
                            }
                          </p>
                        </div>
                      </div>
                      <a
                        href={
                          nationalAuthorities[formData.primaryCountry].website
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 text-sm mt-3 hover:underline"
                      >
                        Visit Website <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                {/* Designated Contact */}
                <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-4">
                    Designated Contact Person
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.designatedContactName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            designatedContactName: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={formData.designatedContactRole}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            designatedContactRole: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="Compliance Officer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.designatedContactEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            designatedContactEmail: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="compliance@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.designatedContactPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            designatedContactPhone: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="+49 123 456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Communication Preferences */}
                <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-4">
                    Communication Preferences
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                        Preferred Language
                      </label>
                      <select
                        value={formData.communicationLanguage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            communicationLanguage: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="en">English</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="it">Italian</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                        Notification Method
                      </label>
                      <select
                        value={formData.notificationMethod}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notificationMethod: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="email">Email Only</option>
                        <option value="portal">NCA Portal</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={saveConfig}
                    disabled={!formData.primaryCountry || saving}
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Reporting Setup */}
          {activeStep === "reporting" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} />
                  Reporting Obligations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportingObligations.map((obligation) => (
                    <div
                      key={obligation.type}
                      className="bg-white dark:bg-white/[0.02] rounded-lg p-4 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {obligation.title}
                            </h4>
                            <span
                              className={`
                              text-xs px-2 py-0.5 rounded-full
                              ${
                                obligation.frequency === "immediate"
                                  ? "bg-red-500/20 text-red-400"
                                  : obligation.frequency === "within_24h"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : obligation.frequency === "within_72h"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-blue-500/20 text-blue-400"
                              }
                            `}
                            >
                              {obligation.frequency.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-white/60 mb-2">
                            {obligation.description}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-white/40">
                            Legal basis: {obligation.legalBasis}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-white/50">
                            Recipients
                          </p>
                          <p className="text-xs text-slate-600 dark:text-white/70">
                            {obligation.recipients
                              .map((r) => r.replace(/_/g, " "))
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-white/10 mt-6">
                  <Button variant="ghost" onClick={() => setActiveStep("nca")}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveStep("incidents")}>
                    Continue to Incidents
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Incident Management */}
          {activeStep === "incidents" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Incident Log
                </CardTitle>
                <Button onClick={() => setShowIncidentForm(true)}>
                  <Plus size={16} className="mr-1" />
                  Log Incident
                </Button>
              </CardHeader>
              <CardContent>
                {/* Incident Form Modal */}
                {showIncidentForm && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0a0a0b] border border-slate-200 dark:border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Log New Incident
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                            Category *
                          </label>
                          <select
                            value={incidentForm.category}
                            onChange={(e) =>
                              setIncidentForm({
                                ...incidentForm,
                                category: e.target.value,
                              })
                            }
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                          >
                            <option value="">Select category...</option>
                            {incidentCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                            Severity *
                          </label>
                          <select
                            value={incidentForm.severity}
                            onChange={(e) =>
                              setIncidentForm({
                                ...incidentForm,
                                severity: e.target.value,
                              })
                            }
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={incidentForm.title}
                            onChange={(e) =>
                              setIncidentForm({
                                ...incidentForm,
                                title: e.target.value,
                              })
                            }
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                            placeholder="Brief incident title"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                            Description *
                          </label>
                          <textarea
                            value={incidentForm.description}
                            onChange={(e) =>
                              setIncidentForm({
                                ...incidentForm,
                                description: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white h-24 resize-none"
                            placeholder="Detailed description of the incident"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                              Detected At *
                            </label>
                            <input
                              type="datetime-local"
                              value={incidentForm.detectedAt}
                              onChange={(e) =>
                                setIncidentForm({
                                  ...incidentForm,
                                  detectedAt: e.target.value,
                                })
                              }
                              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                              Detected By *
                            </label>
                            <input
                              type="text"
                              value={incidentForm.detectedBy}
                              onChange={(e) =>
                                setIncidentForm({
                                  ...incidentForm,
                                  detectedBy: e.target.value,
                                })
                              }
                              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white"
                              placeholder="Name or system"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setShowIncidentForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={createIncident}
                          disabled={
                            !incidentForm.category ||
                            !incidentForm.title ||
                            !incidentForm.description ||
                            !incidentForm.detectedBy ||
                            saving
                          }
                        >
                          {saving ? "Creating..." : "Create Incident"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Incidents List */}
                {incidents.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield
                      size={48}
                      className="mx-auto text-slate-300 dark:text-white/20 mb-4"
                    />
                    <p className="text-slate-500 dark:text-white/60">
                      No incidents logged
                    </p>
                    <p className="text-sm text-slate-400 dark:text-white/40 mt-1">
                      Click &quot;Log Incident&quot; to record a new incident
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="bg-white dark:bg-white/[0.02] rounded-lg p-4 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-slate-400 dark:text-white/40">
                                {incident.incidentNumber}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(incident.severity)}`}
                              >
                                {incident.severity}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(incident.status)}`}
                              >
                                {incident.status}
                              </span>
                            </div>
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {incident.title}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-white/50 mt-1 line-clamp-1">
                              {incident.description}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-400 dark:text-white/40">
                            <p>
                              {new Date(
                                incident.detectedAt,
                              ).toLocaleDateString()}
                            </p>
                            <p>
                              {new Date(
                                incident.detectedAt,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        {incident.reportedToNCA && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/5">
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <Check size={12} /> Reported to NCA
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-white/10 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveStep("reporting")}
                  >
                    Back
                  </Button>
                  <Button onClick={() => setActiveStep("calendar")}>
                    Continue to Calendar
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Compliance Calendar */}
          {activeStep === "calendar" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  Compliance Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calendarEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar
                      size={48}
                      className="mx-auto text-slate-300 dark:text-white/20 mb-4"
                    />
                    <p className="text-slate-500 dark:text-white/60">
                      No upcoming events
                    </p>
                    <p className="text-sm text-slate-400 dark:text-white/40 mt-1">
                      Calendar events will be automatically created based on
                      your reporting obligations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {calendarEvents.map((event) => {
                      const eventConfig =
                        calendarEventTypes[
                          event.eventType as keyof typeof calendarEventTypes
                        ];
                      const daysUntil = Math.ceil(
                        (new Date(event.dueDate).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24),
                      );

                      return (
                        <div
                          key={event.id}
                          className="bg-white dark:bg-white/[0.02] rounded-lg p-4 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div
                                className={`
                                p-2 rounded-lg
                                ${
                                  eventConfig?.color === "blue"
                                    ? "bg-blue-500/10"
                                    : eventConfig?.color === "orange"
                                      ? "bg-orange-500/10"
                                      : eventConfig?.color === "red"
                                        ? "bg-red-500/10"
                                        : eventConfig?.color === "amber"
                                          ? "bg-amber-500/10"
                                          : "bg-slate-100 dark:bg-white/5"
                                }
                              `}
                              >
                                <FileText
                                  size={18}
                                  className={`
                                  ${
                                    eventConfig?.color === "blue"
                                      ? "text-blue-400"
                                      : eventConfig?.color === "orange"
                                        ? "text-orange-400"
                                        : eventConfig?.color === "red"
                                          ? "text-red-400"
                                          : eventConfig?.color === "amber"
                                            ? "text-amber-400"
                                            : "text-slate-500 dark:text-white/60"
                                  }
                                `}
                                />
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                  {event.title}
                                </h4>
                                {event.description && (
                                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                                    {event.description}
                                  </p>
                                )}
                                <p className="text-xs text-slate-400 dark:text-white/40 mt-2">
                                  Due:{" "}
                                  {new Date(event.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`
                                text-sm font-medium
                                ${
                                  daysUntil <= 7
                                    ? "text-red-400"
                                    : daysUntil <= 30
                                      ? "text-amber-400"
                                      : "text-slate-500 dark:text-white/60"
                                }
                              `}
                              >
                                {daysUntil > 0
                                  ? `${daysUntil} days`
                                  : "Overdue"}
                              </span>
                              <p className="text-xs text-slate-400 dark:text-white/40 mt-1">
                                {eventConfig?.label}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-white/10 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveStep("incidents")}
                  >
                    Back
                  </Button>
                  <Button variant="secondary">
                    <Download size={16} className="mr-1" />
                    Export Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function SupervisionPage() {
  return (
    <FeatureGate module="supervision">
      <SupervisionPageContent />
    </FeatureGate>
  );
}
