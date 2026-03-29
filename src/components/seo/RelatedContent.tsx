import Link from "next/link";
import type { TopicClusterLink } from "@/data/topic-clusters";

interface RelatedContentProps {
  cluster: string;
  currentPath: string;
  links: TopicClusterLink[];
}

export default function RelatedContent({
  cluster,
  currentPath,
  links,
}: RelatedContentProps) {
  const filtered = links.filter((l) => l.href !== currentPath);
  if (filtered.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-[#d2d2d7]">
      <h2 className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-6">
        Related {cluster} Resources
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.slice(0, 6).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group block p-5 rounded-xl border border-[#E5E7EB] hover:border-[#1d1d1f] transition-colors"
          >
            <h3 className="text-body-lg font-medium text-[#1d1d1f] group-hover:text-[#6e6e73] transition-colors">
              {link.title}
            </h3>
            <p className="text-body text-[#86868b] mt-1.5 line-clamp-2">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
