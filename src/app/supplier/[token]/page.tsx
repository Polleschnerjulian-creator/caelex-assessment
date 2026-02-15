"use client";

import { useState, useEffect } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useParams } from "next/navigation";
import { Loader2, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import SupplierDataForm from "@/components/supplier-portal/SupplierDataForm";
import SuccessConfirmation from "@/components/supplier-portal/SuccessConfirmation";

interface TokenValidation {
  valid: boolean;
  expired?: boolean;
  revoked?: boolean;
  completed?: boolean;
  request?: {
    id: string;
    supplierName: string;
    componentType: string;
    dataRequired: string[];
    notes?: string;
    deadline?: string;
    companyName?: string;
    missionName?: string;
  };
  error?: string;
}

export default function SupplierPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [validation, setValidation] = useState<TokenValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/supplier/${token}/validate`);
      const data = await response.json();
      setValidation(data);

      // Check if already completed
      if (data.completed) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Token validation error:", error);
      setValidation({
        valid: false,
        error: "Failed to validate access token. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/supplier/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitted(true);
        setSubmissionData(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      }
    } catch (error) {
      throw error; // Re-throw to be handled by form
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="dark-section min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-sm">Validating access...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (!validation?.valid) {
    return (
      <div className="dark-section min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          {validation?.expired ? (
            <>
              <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">
                Link Expired
              </h1>
              <p className="text-white/60 text-sm mb-6">
                This data request link has expired. Please contact the
                requesting party to receive a new link.
              </p>
            </>
          ) : validation?.revoked ? (
            <>
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">
                Access Revoked
              </h1>
              <p className="text-white/60 text-sm mb-6">
                This data request has been cancelled. Please contact the
                requesting party for more information.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">
                Invalid Link
              </h1>
              <p className="text-white/60 text-sm mb-6">
                {validation?.error ||
                  "This link is invalid or no longer active. Please check the link and try again."}
              </p>
            </>
          )}

          <div className="pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs">
              Powered by Caelex Compliance Platform
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted
  if (submitted) {
    return (
      <SuccessConfirmation
        supplierName={validation.request?.supplierName || "Supplier"}
        componentType={validation.request?.componentType || "Component"}
        submissionData={submissionData}
      />
    );
  }

  // Valid token - show form
  return (
    <div className="dark-section min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                Supplier Data Request
              </h1>
              <p className="text-sm text-white/50">
                Environmental footprint data collection
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Powered by</p>
              <p className="text-sm font-medium text-white">Caelex</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Request Info Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-medium mb-1">
                Data Request from{" "}
                {validation.request?.companyName || "Customer"}
              </h2>
              <p className="text-white/60 text-sm mb-4">
                {validation.request?.missionName
                  ? `For mission: ${validation.request.missionName}`
                  : "Environmental footprint assessment"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                    Supplier
                  </p>
                  <p className="text-white">
                    {validation.request?.supplierName}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                    Component Type
                  </p>
                  <p className="text-white">
                    {validation.request?.componentType}
                  </p>
                </div>
                {validation.request?.deadline && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                      Deadline
                    </p>
                    <p className="text-white">
                      {new Date(
                        validation.request.deadline,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {validation.request?.notes && (
                <div className="mt-4 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                    Notes from requester
                  </p>
                  <p className="text-white/70 text-sm">
                    {validation.request.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <SupplierDataForm
          componentType={validation.request?.componentType || "Unknown"}
          dataRequired={validation.request?.dataRequired || []}
          onSubmit={handleSubmit}
        />

        {/* Privacy Notice */}
        <div className="mt-8 p-4 bg-white/[0.02] rounded-lg border border-white/5">
          <p className="text-white/40 text-xs">
            <strong className="text-white/60">Privacy Notice:</strong> The data
            you provide will be used solely for environmental footprint
            calculations as required by EU Space Act regulations. Your data will
            be handled in accordance with GDPR requirements and will not be
            shared with third parties without your consent.
          </p>
        </div>
      </main>
    </div>
  );
}
