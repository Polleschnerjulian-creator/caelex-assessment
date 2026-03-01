"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Lightbulb,
  AlertCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───

type AcademyLessonType =
  | "THEORY"
  | "INTERACTIVE"
  | "QUIZ"
  | "SIMULATION"
  | "CASE_STUDY"
  | "SANDBOX";

interface ContentSection {
  heading?: string;
  paragraphs?: string[];
  keyPoints?: string[];
  callout?: {
    type?: "info" | "warning" | "tip";
    title?: string;
    text: string;
  };
}

interface CaseStudyContent {
  scenario?: {
    title?: string;
    description?: string;
    context?: string;
  };
  sections?: ContentSection[];
  questions?: string[];
}

interface TheoryContent {
  sections?: ContentSection[];
}

interface LessonContentProps {
  lesson: {
    type: AcademyLessonType;
    content?: TheoryContent | CaseStudyContent | Record<string, unknown> | null;
    questions?: unknown[];
    simulationConfig?: unknown;
  };
}

// ─── Helpers ───

const CALLOUT_STYLES: Record<
  string,
  { bg: string; border: string; icon: LucideIcon; iconColor: string }
> = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: AlertCircle,
    iconColor: "text-blue-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: AlertCircle,
    iconColor: "text-amber-400",
  },
  tip: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: Lightbulb,
    iconColor: "text-emerald-400",
  },
};

function CalloutBlock({
  type = "info",
  title,
  text,
}: {
  type?: "info" | "warning" | "tip";
  title?: string;
  text: string;
}) {
  const style = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className={`
        ${style.bg} ${style.border}
        border rounded-xl p-4 my-4
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
        <div className="min-w-0">
          {title && (
            <p className="text-body-lg font-medium text-white mb-1">{title}</p>
          )}
          <p className="text-body text-white/70 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

function KeyPointsList({ points }: { points: string[] }) {
  return (
    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 my-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-emerald-400" />
        <span className="text-small font-medium text-emerald-400 uppercase tracking-wide">
          Key Points
        </span>
      </div>
      <ul className="space-y-2">
        {points.map((point, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-body text-white/70 leading-relaxed"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionRenderer({
  section,
  index,
}: {
  section: ContentSection;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="mb-8"
    >
      {section.heading && (
        <h3 className="text-heading font-medium text-white mb-3">
          {section.heading}
        </h3>
      )}

      {section.paragraphs?.map((paragraph, pIdx) => (
        <p
          key={pIdx}
          className="text-body-lg text-white/65 leading-relaxed mb-3"
        >
          {paragraph}
        </p>
      ))}

      {section.keyPoints && section.keyPoints.length > 0 && (
        <KeyPointsList points={section.keyPoints} />
      )}

      {section.callout && (
        <CalloutBlock
          type={section.callout.type}
          title={section.callout.title}
          text={section.callout.text}
        />
      )}
    </motion.div>
  );
}

// ─── Theory Renderer ───

function TheoryRenderer({ content }: { content: TheoryContent }) {
  if (!content?.sections || content.sections.length === 0) {
    return <EmptyContent message="No theory content available." />;
  }

  return (
    <div className="space-y-2">
      {content.sections.map((section, idx) => (
        <SectionRenderer key={idx} section={section} index={idx} />
      ))}
    </div>
  );
}

// ─── Case Study Renderer ───

function CaseStudyRenderer({ content }: { content: CaseStudyContent }) {
  return (
    <div className="space-y-6">
      {/* Scenario Box */}
      {content?.scenario && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="
            bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl
            p-6
          "
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-small font-medium text-amber-400 uppercase tracking-wide">
              Case Study Scenario
            </span>
          </div>

          {content.scenario.title && (
            <h3 className="text-heading font-medium text-white mb-2">
              {content.scenario.title}
            </h3>
          )}

          {content.scenario.description && (
            <p className="text-body-lg text-white/65 leading-relaxed mb-2">
              {content.scenario.description}
            </p>
          )}

          {content.scenario.context && (
            <p className="text-body text-white/50 leading-relaxed italic">
              {content.scenario.context}
            </p>
          )}
        </motion.div>
      )}

      {/* Sections */}
      {content?.sections?.map((section, idx) => (
        <SectionRenderer key={idx} section={section} index={idx + 1} />
      ))}

      {/* Discussion Questions */}
      {content?.questions && content.questions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (content.sections?.length ?? 0) * 0.08 + 0.1 }}
          className="bg-white/[0.04] border border-white/10 rounded-xl p-5"
        >
          <h4 className="text-subtitle font-medium text-white mb-3">
            Discussion Questions
          </h4>
          <ol className="space-y-2 list-decimal list-inside">
            {content.questions.map((question, qIdx) => (
              <li
                key={qIdx}
                className="text-body-lg text-white/65 leading-relaxed"
              >
                {question}
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </div>
  );
}

// ─── Empty / Unavailable ───

function EmptyContent({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <BookOpen className="w-6 h-6 text-white/25" />
      </div>
      <p className="text-body-lg text-white/40">{message}</p>
    </div>
  );
}

// ─── Main Component ───

export default function LessonContent({ lesson }: LessonContentProps) {
  const { type, content } = lesson;

  if (!content) {
    return <EmptyContent message="Content unavailable for this lesson." />;
  }

  switch (type) {
    case "THEORY":
      return <TheoryRenderer content={content as TheoryContent} />;

    case "CASE_STUDY":
      return <CaseStudyRenderer content={content as CaseStudyContent} />;

    case "QUIZ":
      // Quiz is handled by a separate QuizRunner component
      return (
        <EmptyContent message="This lesson is a quiz. Use the quiz runner to begin." />
      );

    case "SIMULATION":
      // Simulation is handled by a separate SimulationRunner component
      return (
        <EmptyContent message="This lesson is a simulation. Use the simulation runner to begin." />
      );

    case "INTERACTIVE":
    case "SANDBOX":
      // Future: render interactive / sandbox content
      if ((content as TheoryContent)?.sections) {
        return <TheoryRenderer content={content as TheoryContent} />;
      }
      return <EmptyContent message="Interactive content is loading..." />;

    default:
      return (
        <EmptyContent message="Content unavailable for this lesson type." />
      );
  }
}
