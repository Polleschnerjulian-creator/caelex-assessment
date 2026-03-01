"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import MaterialsLibrary from "@/components/assure/MaterialsLibrary";

// ─── Types ───

interface Material {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  pdfUrl?: string;
}

// ─── Component ───

export default function AssureMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const res = await fetch("/api/assure/materials");
        if (res.ok) {
          const data = await res.json();
          setMaterials(data.materials || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch materials:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMaterials();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-xl" />
          ))}
        </div>
        <span className="sr-only">Loading materials...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={false}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Investor Materials
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            {materials.length > 0
              ? `${materials.length} materials generated.`
              : "Generate investor-ready materials from your profile data."}
          </motion.p>
        </div>
        <Link
          href="/assure/materials/generator"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          Generate New
        </Link>
      </div>

      {/* Materials Library */}
      <MaterialsLibrary materials={materials} />
    </div>
  );
}
