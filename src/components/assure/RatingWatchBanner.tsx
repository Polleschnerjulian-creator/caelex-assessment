"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

// ─── Types ───

interface RatingWatchBannerProps {
  onWatch: boolean;
  watchReason?: string;
}

// ─── Component ───

export default function RatingWatchBanner({
  onWatch,
  watchReason,
}: RatingWatchBannerProps) {
  return (
    <AnimatePresence>
      {onWatch && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -8 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-body font-medium text-amber-800 dark:text-amber-300">
                Rating Watch
              </h3>
              {watchReason ? (
                <p className="text-small text-amber-700 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                  {watchReason}
                </p>
              ) : (
                <p className="text-small text-amber-700 dark:text-amber-400/80 mt-0.5">
                  This rating is currently under review and may be subject to
                  change.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
