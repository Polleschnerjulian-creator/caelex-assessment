"use client";

import { motion } from "framer-motion";
import { AlertCircle, RotateCcw, ExternalLink } from "lucide-react";

interface OutOfScopeResultProps {
  message: string;
  detail: string;
  onRestart: () => void;
}

export default function OutOfScopeResult({
  message,
  detail,
  onRestart,
}: OutOfScopeResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto text-center py-12"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-white/[0.08] flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={28} className="text-white/70" />
      </div>

      {/* Title */}
      <h2 className="text-[24px] font-light tracking-[-0.02em] text-white mb-3">
        Outside Regulation Scope
      </h2>

      {/* Message */}
      <p className="text-[15px] text-white/80 mb-8 leading-relaxed">
        {message}
      </p>

      {/* Detail Box */}
      {detail && (
        <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl p-5 mb-8 text-left">
          <p className="text-[14px] text-white/70 leading-relaxed">{detail}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <button
          onClick={onRestart}
          className="font-mono text-[12px] text-white/70 hover:text-white transition-colors flex items-center gap-2"
        >
          <RotateCcw size={14} />
          Start over
        </button>

        <a
          href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[12px] text-white/70 hover:text-white transition-colors flex items-center gap-2"
        >
          Read the EU Space Act
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Caelex CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-16 pt-8 border-t border-white/[0.12]"
      >
        <p className="text-[14px] text-white/60 mb-2">
          Planning future missions that might be in scope?
        </p>
        <p className="text-[13px] text-white/50">
          Caelex helps space operators prepare for EU Space Act compliance.
        </p>
      </motion.div>
    </motion.div>
  );
}
