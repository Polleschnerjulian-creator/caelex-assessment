"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InstructorClassroomsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/academy/instructor");
  }, [router]);

  return null;
}
