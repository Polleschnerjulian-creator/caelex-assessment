"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

const positionTitles: Record<string, string> = {
  "cto-cofounder": "Co-Founder & CTO",
  "coo-cofounder": "Co-Founder & COO",
};

function ApplicationFormContent() {
  const searchParams = useSearchParams();
  const positionId = searchParams.get("position") || "";
  const positionTitle = positionTitles[positionId] || "Co-Founder Position";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
    experience: "",
    motivation: "",
    availability: "",
    salary: "",
    referral: "",
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("position", positionTitle);
      formDataToSend.append("positionId", positionId);
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      if (resumeFile) {
        formDataToSend.append("resume", resumeFile);
      }

      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[500px] text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-[28px] font-light tracking-[-0.02em] mb-4">
            Application Submitted
          </h1>
          <p className="text-[15px] text-white/50 mb-8">
            Thank you for your interest in joining Caelex as {positionTitle}.
            We'll review your application and get back to you within 5 business
            days.
          </p>
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Careers
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href={positionId ? `/careers/${positionId}` : "/careers"}
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Form */}
      <section className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-[32px] font-light tracking-[-0.02em] mb-2">
              Apply for {positionTitle}
            </h1>
            <p className="text-[15px] text-white/50 mb-10">
              Tell us about yourself and why you'd be a great fit for this role.
            </p>

            {submitStatus === "error" && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className="text-red-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-[14px] text-red-400 font-medium">
                    Submission failed
                  </p>
                  <p className="text-[13px] text-red-400/70">
                    Please try again or email us directly at careers@caelex.eu
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div>
                <h2 className="text-[16px] font-medium mb-4 text-white/80">
                  Personal Information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="+49 123 456 789"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[13px] text-white/50 mb-2">
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-[13px] text-white/50 mb-2">
                    Current Location <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                    placeholder="Berlin, Germany"
                  />
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <h2 className="text-[16px] font-medium mb-4 text-white/80">
                  Resume / CV
                </h2>
                <div className="relative">
                  {resumeFile ? (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                          <Upload size={18} className="text-white/40" />
                        </div>
                        <div>
                          <p className="text-[14px] text-white/80">
                            {resumeFile.name}
                          </p>
                          <p className="text-[12px] text-white/40">
                            {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
                      >
                        <X size={16} className="text-white/60" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-8 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.15] transition-colors">
                      <Upload size={24} className="text-white/40 mb-3" />
                      <p className="text-[14px] text-white/60 mb-1">
                        Drop your resume here or click to upload
                      </p>
                      <p className="text-[12px] text-white/30">
                        PDF, DOC, or DOCX (max 10MB)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Experience */}
              <div>
                <h2 className="text-[16px] font-medium mb-4 text-white/80">
                  Experience
                </h2>
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">
                    Years of Relevant Experience{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] focus:outline-none focus:border-white/20 transition-colors appearance-none"
                  >
                    <option value="" className="bg-black">
                      Select...
                    </option>
                    <option value="3-5" className="bg-black">
                      3-5 years
                    </option>
                    <option value="5-7" className="bg-black">
                      5-7 years
                    </option>
                    <option value="7-10" className="bg-black">
                      7-10 years
                    </option>
                    <option value="10+" className="bg-black">
                      10+ years
                    </option>
                  </select>
                </div>
              </div>

              {/* Motivation */}
              <div>
                <h2 className="text-[16px] font-medium mb-4 text-white/80">
                  About You
                </h2>
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">
                    Why do you want to join Caelex as a co-founder?{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors resize-none"
                    placeholder="Tell us about your motivation, relevant experience, and what you would bring to the team..."
                  />
                </div>
              </div>

              {/* Availability & Compensation */}
              <div>
                <h2 className="text-[16px] font-medium mb-4 text-white/80">
                  Availability & Expectations
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">
                      Earliest Start Date{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="availability"
                      value={formData.availability}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="e.g., Immediately, Q2 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">
                      Salary Expectations (optional)
                    </label>
                    <input
                      type="text"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="e.g., €80-100k + equity"
                    />
                  </div>
                </div>
              </div>

              {/* Referral */}
              <div>
                <label className="block text-[13px] text-white/50 mb-2">
                  How did you hear about this position?
                </label>
                <select
                  name="referral"
                  value={formData.referral}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[14px] focus:outline-none focus:border-white/20 transition-colors appearance-none"
                >
                  <option value="" className="bg-black">
                    Select...
                  </option>
                  <option value="linkedin" className="bg-black">
                    LinkedIn
                  </option>
                  <option value="website" className="bg-black">
                    Caelex Website
                  </option>
                  <option value="esa-bic" className="bg-black">
                    ESA BIC Network
                  </option>
                  <option value="referral" className="bg-black">
                    Personal Referral
                  </option>
                  <option value="conference" className="bg-black">
                    Conference / Event
                  </option>
                  <option value="other" className="bg-black">
                    Other
                  </option>
                </select>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white text-black text-[15px] font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <Send size={18} />
                    </>
                  )}
                </button>
                <p className="text-[12px] text-white/30 text-center mt-4">
                  By submitting this form, you agree to our{" "}
                  <Link
                    href="/legal/privacy"
                    className="underline hover:text-white/50"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

export default function ApplicationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </main>
      }
    >
      <ApplicationFormContent />
    </Suspense>
  );
}
