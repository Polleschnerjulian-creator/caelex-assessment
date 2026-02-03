"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

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
      className="max-w-2xl mx-auto text-center"
    >
      <Card variant="elevated" padding="lg">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-white mb-3">Out of Scope</h2>
        <p className="text-lg text-green-400 font-medium mb-6">{message}</p>

        {/* Detail */}
        <div className="bg-navy-900 rounded-lg p-5 mb-8 text-left">
          <p className="text-slate-300 leading-relaxed">{detail}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="secondary" onClick={onRestart}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Start Over
          </Button>
          <a
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost">
              Read the EU Space Act
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </Card>

      {/* Caelex CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <p className="text-slate-500 text-sm mb-4">
          Planning future missions that might be in scope?
        </p>
        <p className="text-slate-400 text-sm">
          Caelex helps space operators prepare for EU Space Act compliance. Get
          notified when we launch.
        </p>
      </motion.div>
    </motion.div>
  );
}
