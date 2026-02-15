"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  ExternalLink,
} from "lucide-react";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  documentId: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
  onDownload?: () => void;
}

export default function DocumentViewer({
  documentId,
  fileName,
  mimeType,
  onClose,
  onDownload,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  const canPreview = isPdf || isImage;

  useEffect(() => {
    const fetchDownloadUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/documents/${documentId}/download`);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to get download URL");
        }

        const data = await res.json();
        setFileUrl(data.downloadUrl);
      } catch (err) {
        console.error("Error fetching download URL:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDownloadUrl();
  }, [documentId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setError("Failed to load PDF document");
    setLoading(false);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, numPages));

  const handleDownload = async () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
    onDownload?.();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div
          className="flex items-center justify-center h-full"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="text-center">
            <Loader2
              className="w-8 h-8 animate-spin text-slate-400 dark:text-white/40 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-slate-600 dark:text-white/60">
              Loading document...
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full" role="alert">
          <div className="text-center">
            <File
              className="w-12 h-12 text-slate-400 dark:text-white/30 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-slate-600 dark:text-white/60 mb-2">{error}</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Download size={16} />
              Download Instead
            </button>
          </div>
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-600 dark:text-white/60">
            No preview available
          </p>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="flex flex-col items-center overflow-auto h-full p-4">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-white/40" />
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full p-4 overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={fileName}
            style={{ transform: `scale(${scale})` }}
            className="max-w-full max-h-full object-contain shadow-lg transition-transform"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <File className="w-16 h-16 text-slate-400 dark:text-white/30 mb-4" />
        <p className="text-slate-600 dark:text-white/60 mb-2">
          Preview not available for this file type
        </p>
        <p className="text-sm text-slate-500 dark:text-white/40 mb-4">
          {mimeType}
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Download size={16} />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center ${
        isFullscreen ? "" : "p-4 md:p-8"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Document viewer: ${fileName}`}
        className={`bg-white dark:bg-[#0a0a0b] rounded-xl shadow-2xl flex flex-col ${
          isFullscreen
            ? "w-full h-full rounded-none"
            : "w-full max-w-5xl h-[85vh]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            {isPdf ? (
              <FileText className="w-5 h-5 text-red-500" aria-hidden="true" />
            ) : isImage ? (
              <ImageIcon className="w-5 h-5 text-blue-500" aria-hidden="true" />
            ) : (
              <File
                className="w-5 h-5 text-slate-400 dark:text-white/40"
                aria-hidden="true"
              />
            )}
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                {fileName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {mimeType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canPreview && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={18} aria-hidden="true" />
                </button>
                <span className="text-sm text-slate-600 dark:text-white/60 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={18} aria-hidden="true" />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2" />
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 size={18} aria-hidden="true" />
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
              aria-label="Download"
            >
              <Download size={18} aria-hidden="true" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-black/30">
          {renderPreview()}
        </div>

        {/* Footer with pagination (PDF only) */}
        {isPdf && numPages > 0 && (
          <nav
            aria-label="PDF page navigation"
            className="flex items-center justify-center gap-4 px-6 py-3 border-t border-slate-200 dark:border-white/10"
          >
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className="text-sm text-slate-600 dark:text-white/60">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              aria-label="Next page"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
