"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function LearnRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetch("/api/academy/progress")
      .then((r) => r.json())
      .then((data) => {
        const enrollment = data.enrollments?.find(
          (e: { course?: { slug?: string } }) =>
            e.course?.slug === params.courseSlug,
        );
        if (enrollment?.currentLessonId) {
          router.replace(
            `/dashboard/academy/courses/${params.courseSlug}/learn/${enrollment.currentLessonId}`,
          );
        } else {
          router.replace(`/dashboard/academy/courses/${params.courseSlug}`);
        }
      })
      .catch(() => {
        router.replace(`/dashboard/academy/courses/${params.courseSlug}`);
      });
  }, [params.courseSlug, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        <p className="text-body text-white/50">Loading lesson...</p>
      </div>
    </div>
  );
}
