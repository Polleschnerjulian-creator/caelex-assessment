"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Folder,
  FileCheck,
  Award,
  Shield,
  Settings,
  FileSignature,
  Building2,
  X,
  ChevronRight,
  ExternalLink,
  Eye,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  documentCategories,
  categoryDisplayInfo,
  getExpiryStatus,
  getDaysUntilExpiry,
  formatFileSize,
  getStatusColor,
} from "@/data/document-vault";

type Step = "overview" | "upload" | "expiry-tracker" | "compliance-check";

interface Document {
  id: string;
  name: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  status: string;
  issueDate: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  moduleType: string | null;
  regulatoryRef: string | null;
  accessLevel: string;
  version: number;
  createdAt: string;
}

interface DashboardStats {
  total: number;
  expired: number;
  expiringThisMonth: number;
  expiringNext90Days: number;
  draft: number;
  active: number;
  completeness: number;
}

interface ModuleCompliance {
  module: string;
  required: number;
  present: number;
  completeness: number;
  missing: {
    category: string;
    name: string;
    criticality: string;
    regulatoryRef?: string;
  }[];
}

const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Folder size={18} /> },
  { id: "upload", label: "Upload", icon: <Upload size={18} /> },
  { id: "expiry-tracker", label: "Expiry Tracker", icon: <Clock size={18} /> },
  {
    id: "compliance-check",
    label: "Compliance Check",
    icon: <CheckCircle2 size={18} />,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  LICENSE: <FileCheck size={16} />,
  PERMIT: <FileCheck size={16} />,
  AUTHORIZATION: <FileCheck size={16} />,
  CERTIFICATE: <Award size={16} />,
  ISO_CERTIFICATE: <Award size={16} />,
  SECURITY_CERT: <Shield size={16} />,
  INSURANCE_POLICY: <Shield size={16} />,
  INSURANCE_CERT: <Shield size={16} />,
  COMPLIANCE_REPORT: <FileText size={16} />,
  AUDIT_REPORT: <FileText size={16} />,
  INCIDENT_REPORT: <AlertTriangle size={16} />,
  ANNUAL_REPORT: <FileText size={16} />,
  TECHNICAL_SPEC: <Settings size={16} />,
  DESIGN_DOC: <FileText size={16} />,
  CONTRACT: <FileSignature size={16} />,
  NDA: <FileSignature size={16} />,
  REGULATORY_FILING: <Building2 size={16} />,
  POLICY: <FileText size={16} />,
  OTHER: <FileText size={16} />,
};

export default function DocumentsPage() {
  const [activeStep, setActiveStep] = useState<Step>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<Document[]>([]);
  const [expiredDocuments, setExpiredDocuments] = useState<Document[]>([]);
  const [moduleCompliance, setModuleCompliance] = useState<ModuleCompliance[]>(
    [],
  );
  const [overallCompleteness, setOverallCompleteness] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    category: "LICENSE",
    subcategory: "",
    moduleType: "",
    issueDate: "",
    expiryDate: "",
    regulatoryRef: "",
    accessLevel: "INTERNAL",
    tags: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeStep === "compliance-check") {
      fetchComplianceCheck();
    }
  }, [activeStep]);

  const fetchData = async () => {
    try {
      const [dashboardRes, docsRes] = await Promise.all([
        fetch("/api/documents/dashboard"),
        fetch("/api/documents?limit=50"),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data.stats);
        setExpiringDocuments(data.expiringDocuments || []);
        setExpiredDocuments(data.expiredDocuments || []);
      }

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching document data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplianceCheck = async () => {
    try {
      const res = await fetch("/api/documents/compliance-check");
      if (res.ok) {
        const data = await res.json();
        setModuleCompliance(data.moduleCompliance || []);
        setOverallCompleteness(data.overallCompleteness || 0);
      }
    } catch (error) {
      console.error("Error fetching compliance check:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.name) {
        setUploadForm({
          ...uploadForm,
          name: file.name.replace(/\.[^/.]+$/, ""),
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.category) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Object.entries(uploadForm).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setShowUploadModal(false);
        setUploadForm({
          name: "",
          description: "",
          category: "LICENSE",
          subcategory: "",
          moduleType: "",
          issueDate: "",
          expiryDate: "",
          regulatoryRef: "",
          accessLevel: "INTERNAL",
          tags: "",
        });
        setSelectedFile(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploading(false);
    }
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const status = getExpiryStatus(new Date(expiryDate));
    const days = getDaysUntilExpiry(new Date(expiryDate));

    if (status === "expired") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
          Expired
        </span>
      );
    }
    if (status === "expiringSoon") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
          {days} days left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
        Valid
      </span>
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group documents by category
  const documentsByCategory = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) acc[doc.category] = [];
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/5 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 mb-2">
            DOCUMENTS
          </p>
          <h1 className="text-2xl font-semibold text-white">Document Vault</h1>
          <p className="text-white/60 mt-1">
            Secure storage for compliance documents and certificates
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload size={16} className="mr-1" />
          Upload Document
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {stats.total}
                  </p>
                  <p className="text-xs text-white/50">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-white/[0.02] ${stats.expired > 0 ? "border-red-500/30" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${stats.expired > 0 ? "bg-red-500/20" : "bg-white/5"}`}
                >
                  <AlertTriangle
                    size={18}
                    className={
                      stats.expired > 0 ? "text-red-400" : "text-white/40"
                    }
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-semibold ${stats.expired > 0 ? "text-red-400" : "text-white"}`}
                  >
                    {stats.expired}
                  </p>
                  <p className="text-xs text-white/50">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {stats.expiringThisMonth}
                  </p>
                  <p className="text-xs text-white/50">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {stats.completeness}%
                  </p>
                  <p className="text-xs text-white/50">Completeness</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex items-center gap-2 p-1 bg-white/[0.02] rounded-xl border border-white/5">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all
              ${
                activeStep === step.id
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              }
            `}
          >
            {step.icon}
            <span className="hidden md:inline">{step.label}</span>
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
          {/* Overview */}
          {activeStep === "overview" && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <select
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">All Categories</option>
                  {categoryDisplayInfo.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Documents by Category */}
              {Object.keys(documentsByCategory).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Folder size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60">No documents found</p>
                    <p className="text-sm text-white/40 mt-1 mb-4">
                      Upload your first document to get started
                    </p>
                    <Button onClick={() => setShowUploadModal(true)}>
                      <Upload size={16} className="mr-1" />
                      Upload Document
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(documentsByCategory).map(([category, docs]) => {
                  const catInfo = categoryDisplayInfo.find(
                    (c) => c.id === category,
                  );
                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded"
                            style={{
                              backgroundColor: `${catInfo?.color || "#6b7280"}20`,
                            }}
                          >
                            {categoryIcons[category] || <FileText size={16} />}
                          </div>
                          {catInfo?.label || category}
                          <span className="text-white/40 text-sm font-normal ml-2">
                            {docs.length} document{docs.length !== 1 ? "s" : ""}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-white/60">
                                {categoryIcons[doc.category] || (
                                  <FileText size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {doc.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-white/40">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                  {doc.regulatoryRef && (
                                    <span className="text-xs text-white/40">
                                      | {doc.regulatoryRef}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getExpiryBadge(doc.expiryDate)}
                              <span
                                className="px-2 py-0.5 text-xs rounded-full"
                                style={{
                                  backgroundColor: `${getStatusColor(doc.status)}20`,
                                  color: getStatusColor(doc.status),
                                }}
                              >
                                {doc.status}
                              </span>
                              <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                                <Eye size={14} className="text-white/40" />
                              </button>
                              <button className="p-1.5 hover:bg-white/5 rounded transition-colors">
                                <Download size={14} className="text-white/40" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Upload */}
          {activeStep === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload size={20} />
                  Upload New Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/30 transition-colors"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif"
                  />
                  <Upload size={48} className="mx-auto text-white/20 mb-4" />
                  {selectedFile ? (
                    <div>
                      <p className="text-white font-medium">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-white/50 mt-1">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white/60">
                        Drop a file here or click to browse
                      </p>
                      <p className="text-sm text-white/40 mt-1">
                        Allowed: PDF, DOCX, XLSX, PNG, JPG | Max: 50 MB
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      Document Name *
                    </label>
                    <input
                      type="text"
                      value={uploadForm.name}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, name: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                      placeholder="Document name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      Category *
                    </label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          category: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      {categoryDisplayInfo.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={uploadForm.issueDate}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          issueDate: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={uploadForm.expiryDate}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          expiryDate: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      Linked Module
                    </label>
                    <select
                      value={uploadForm.moduleType}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          moduleType: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">None</option>
                      <option value="AUTHORIZATION">Authorization</option>
                      <option value="DEBRIS">Debris Mitigation</option>
                      <option value="CYBERSECURITY">Cybersecurity</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="ENVIRONMENTAL">Environmental</option>
                      <option value="SUPERVISION">Supervision</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      Regulatory Reference
                    </label>
                    <input
                      type="text"
                      value={uploadForm.regulatoryRef}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          regulatoryRef: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g., EU Space Act Art. 18"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-1">
                      Description
                    </label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white h-20 resize-none focus:outline-none focus:border-emerald-500/50"
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadForm.name || uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expiry Tracker */}
          {activeStep === "expiry-tracker" && (
            <div className="space-y-6">
              {/* Expired Documents */}
              {expiredDocuments.length > 0 && (
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-400">
                      <AlertTriangle size={20} />
                      Expired Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {expiredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-red-500/10 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-red-400">
                            {categoryIcons[doc.category] || (
                              <FileText size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{doc.name}</p>
                            <p className="text-xs text-white/50">
                              Expired:{" "}
                              {new Date(doc.expiryDate!).toLocaleDateString()}
                              {doc.regulatoryRef && ` | ${doc.regulatoryRef}`}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="secondary">
                          Upload New Version
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Expiring Soon */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} />
                    Expiring in Next 90 Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expiringDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2
                        size={48}
                        className="mx-auto text-emerald-400/50 mb-4"
                      />
                      <p className="text-white/60">
                        No documents expiring soon
                      </p>
                      <p className="text-sm text-white/40 mt-1">
                        All your documents are up to date
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expiringDocuments.map((doc) => {
                        const days = getDaysUntilExpiry(
                          new Date(doc.expiryDate!),
                        );
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="p-2 rounded-lg"
                                style={{
                                  backgroundColor:
                                    days && days <= 30
                                      ? "rgba(249, 115, 22, 0.1)"
                                      : "rgba(234, 179, 8, 0.1)",
                                }}
                              >
                                {categoryIcons[doc.category] || (
                                  <FileText size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-white/50">
                                  {
                                    categoryDisplayInfo.find(
                                      (c) => c.id === doc.category,
                                    )?.label
                                  }
                                  {doc.regulatoryRef &&
                                    ` | ${doc.regulatoryRef}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span
                                  className={`text-sm font-medium ${
                                    days && days <= 30
                                      ? "text-orange-400"
                                      : "text-amber-400"
                                  }`}
                                >
                                  {days} days
                                </span>
                                <p className="text-xs text-white/40">
                                  {new Date(
                                    doc.expiryDate!,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost">
                                Renew
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Compliance Check */}
          {activeStep === "compliance-check" && (
            <div className="space-y-6">
              {/* Overall Completeness */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Overall Compliance
                      </h3>
                      <p className="text-sm text-white/50">
                        Document completeness across all modules
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {overallCompleteness}%
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        overallCompleteness >= 80
                          ? "bg-emerald-500"
                          : overallCompleteness >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${overallCompleteness}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Module Breakdown */}
              <div className="space-y-4">
                {moduleCompliance.map((module) => (
                  <Card key={module.module}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              module.completeness >= 100
                                ? "bg-emerald-500/10"
                                : module.completeness >= 50
                                  ? "bg-amber-500/10"
                                  : "bg-red-500/10"
                            }`}
                          >
                            {module.completeness >= 100 ? (
                              <CheckCircle2
                                size={18}
                                className="text-emerald-400"
                              />
                            ) : (
                              <AlertTriangle
                                size={18}
                                className={
                                  module.completeness >= 50
                                    ? "text-amber-400"
                                    : "text-red-400"
                                }
                              />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">
                              {module.module}
                            </h4>
                            <p className="text-xs text-white/50">
                              {module.present} of {module.required} required
                              documents
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-lg font-semibold ${
                              module.completeness >= 100
                                ? "text-emerald-400"
                                : module.completeness >= 50
                                  ? "text-amber-400"
                                  : "text-red-400"
                            }`}
                          >
                            {module.completeness}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            module.completeness >= 100
                              ? "bg-emerald-500"
                              : module.completeness >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(module.completeness, 100)}%`,
                          }}
                        />
                      </div>

                      {module.missing.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-white/40 mb-2">
                            Missing documents:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {module.missing.map((doc, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400"
                              >
                                {doc.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0b] border border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Upload Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>

            <div
              className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/30 transition-colors mb-4"
              onClick={() =>
                document.getElementById("modal-file-upload")?.click()
              }
            >
              <input
                id="modal-file-upload"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div>
                  <FileText
                    size={32}
                    className="mx-auto text-emerald-400 mb-2"
                  />
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-white/50">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="mx-auto text-white/20 mb-2" />
                  <p className="text-white/60">Click to select file</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, name: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
                  placeholder="Document name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">
                  Category *
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, category: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
                >
                  {categoryDisplayInfo.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.issueDate}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        issueDate: e.target.value,
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!uploadForm.name || uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
