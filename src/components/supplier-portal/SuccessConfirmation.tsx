"use client";

import { CheckCircle2, Download, ArrowRight } from "lucide-react";

interface SuccessConfirmationProps {
  supplierName: string;
  componentType: string;
  submissionData?: Record<string, unknown> | null;
}

export default function SuccessConfirmation({
  supplierName,
  componentType,
  submissionData,
}: SuccessConfirmationProps) {
  const handleDownloadReceipt = () => {
    // Create a simple receipt document
    const receipt = {
      supplierName,
      componentType,
      submittedAt: new Date().toISOString(),
      confirmationNumber: `SUP-${Date.now().toString(36).toUpperCase()}`,
      dataPoints: submissionData ? Object.keys(submissionData).length : 0,
    };

    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submission-receipt-${receipt.confirmationNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dark-section min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-white mb-2">
            Data Submitted Successfully
          </h1>

          {/* Subtitle */}
          <p className="text-white/60 mb-8">
            Thank you for providing environmental data for your component.
          </p>

          {/* Submission Details */}
          <div className="bg-white/[0.02] rounded-lg p-4 mb-6 text-left">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Supplier
                </p>
                <p className="text-white">{supplierName}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Component
                </p>
                <p className="text-white">{componentType}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Submitted
                </p>
                <p className="text-white">
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Reference
                </p>
                <p className="text-white font-mono text-xs">
                  SUP-{Date.now().toString(36).toUpperCase().slice(0, 8)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadReceipt}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Submission Receipt
            </button>
          </div>

          {/* Next Steps */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="text-white/90 font-medium mb-4">
              What happens next?
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-medium">1</span>
                </div>
                <p className="text-white/60 text-sm">
                  Your data will be reviewed by the requesting party
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-medium">2</span>
                </div>
                <p className="text-white/60 text-sm">
                  The data will be incorporated into their Environmental
                  Footprint Declaration
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-medium">3</span>
                </div>
                <p className="text-white/60 text-sm">
                  You may be contacted if additional information is needed
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/40 text-xs">
              You can safely close this window. Your data has been securely
              stored.
            </p>
          </div>
        </div>

        {/* Caelex Branding */}
        <div className="mt-6 text-center">
          <p className="text-white/30 text-xs">
            Powered by <span className="text-white/50 font-medium">Caelex</span>
            {" · "}
            Space Compliance Platform
          </p>
        </div>
      </div>
    </div>
  );
}
