import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { Generate2Page } from "@/components/generate2/Generate2Page";

export default function GeneratePage() {
  return (
    <ErrorBoundary>
      <Generate2Page />
    </ErrorBoundary>
  );
}
