"use client";

import { Shield, Copy, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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

export default function CertificateCard({
  cert,
  onTogglePublic,
  onRevoke,
  onCopy,
}: {
  cert: CertificateData;
  onTogglePublic: (id: string, isPublic: boolean) => void;
  onRevoke: (id: string) => void;
  onCopy: (certificateId: string) => void;
}) {
  const isExpired = new Date(cert.expiresAt) < new Date();

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-white/60" />
          </div>
          <div>
            <p className="text-body font-medium text-white">
              Certificate {cert.certificateId.slice(0, 16)}...
            </p>
            <p className="text-caption text-white/30">
              {cert.satelliteNorad
                ? `NORAD ${cert.satelliteNorad}`
                : "Organization-wide"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpired ? (
            <Badge variant="error">Expired</Badge>
          ) : (
            <Badge
              variant="default"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              Active
            </Badge>
          )}
          {cert.isPublic ? (
            <Badge variant="outline" className="text-white/50">
              <Eye className="w-3 h-3 mr-1" />
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="text-white/30">
              <EyeOff className="w-3 h-3 mr-1" />
              Private
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {cert.regulationRefs.map((ref) => (
          <Badge
            key={ref}
            variant="outline"
            className="text-caption text-white/40"
          >
            {ref.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-caption text-white/30">Claims</p>
          <p className="text-body font-medium text-white">{cert.claimsCount}</p>
        </div>
        <div>
          <p className="text-caption text-white/30">Trust</p>
          <p className="text-body font-medium text-white">
            {cert.minTrustLevel}
          </p>
        </div>
        <div>
          <p className="text-caption text-white/30">Sentinel</p>
          <p className="text-body font-medium text-white">
            {cert.sentinelBacked}/{cert.claimsCount}
          </p>
        </div>
        <div>
          <p className="text-caption text-white/30">Verified</p>
          <p className="text-body font-medium text-white">
            {cert.verificationCount}x
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => onCopy(cert.certificateId)}
          className="flex-1"
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy ID
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            window.open(`/verity/verify?id=${cert.certificateId}`, "_blank")
          }
          className="flex-1"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          Verify
        </Button>
        <Button
          variant="secondary"
          onClick={() => onTogglePublic(cert.id, !cert.isPublic)}
        >
          {cert.isPublic ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => onRevoke(cert.id)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
