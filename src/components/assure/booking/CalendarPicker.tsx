"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isAfter,
} from "date-fns";
import { de } from "date-fns/locale";

// ─── Types ───

export interface Slot {
  date: string; // "2026-03-02"
  time: string; // "10:00"
  dateTime: string; // ISO UTC string
}

interface SlotsResponse {
  slots: Slot[];
}

interface CalendarPickerProps {
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot | null) => void;
}

// ─── Constants ───

/** Day offsets from Monday: Mo=0, Di=1, Do=3 */
const DAY_OFFSETS = [0, 1, 3] as const;
const DAY_LABELS = ["Mo", "Di", "Do"] as const;

// ─── Helpers ───

function getWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const startStr = format(monday, "d. MMM", { locale: de });
  const endStr = format(sunday, "d. MMM yyyy", { locale: de });
  return `${startStr} \u2013 ${endStr}`;
}

function formatWeekParam(monday: Date): string {
  return format(monday, "yyyy-MM-dd");
}

function formatDayDate(monday: Date, offset: number): string {
  return format(addDays(monday, offset), "d. MMM", { locale: de });
}

function getDayDateStr(monday: Date, offset: number): string {
  return format(addDays(monday, offset), "yyyy-MM-dd");
}

// ─── Component ───

export default function CalendarPicker({
  selectedSlot,
  onSelectSlot,
}: CalendarPickerProps) {
  const today = useMemo(() => new Date(), []);
  const currentMonday = useMemo(() => getWeekMonday(today), [today]);

  const [weekMonday, setWeekMonday] = useState<Date>(currentMonday);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent navigating to past weeks
  const canGoBack = isAfter(weekMonday, currentMonday);

  // ─── Fetch slots for the active week ───

  const fetchSlots = useCallback(async (monday: Date) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/assure/slots?week=${formatWeekParam(monday)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to load slots (${res.status})`);
      }
      const data: SlotsResponse = await res.json();
      setSlots(data.slots);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load available slots",
      );
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots(weekMonday);
  }, [weekMonday, fetchSlots]);

  // ─── Derived data ───

  const slotsByDay = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const offset of DAY_OFFSETS) {
      const dateStr = getDayDateStr(weekMonday, offset);
      map[dateStr] = [];
    }
    for (const slot of slots) {
      if (map[slot.date]) {
        map[slot.date].push(slot);
      }
    }
    return map;
  }, [slots, weekMonday]);

  const activeDateStr = getDayDateStr(weekMonday, DAY_OFFSETS[activeDayIndex]);
  const activeSlots = slotsByDay[activeDateStr] ?? [];

  // ─── Handlers ───

  function handlePrevWeek() {
    if (!canGoBack) return;
    setWeekMonday((prev) => subWeeks(prev, 1));
    setActiveDayIndex(0);
  }

  function handleNextWeek() {
    setWeekMonday((prev) => addWeeks(prev, 1));
    setActiveDayIndex(0);
  }

  function handleSelectSlot(slot: Slot) {
    if (selectedSlot && selectedSlot.dateTime === slot.dateTime) {
      onSelectSlot(null);
    } else {
      onSelectSlot(slot);
    }
  }

  // ─── Render ───

  return (
    <div className="glass-surface rounded-2xl border border-white/[0.08] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-emerald-400" />
        <h3 className="text-title font-semibold text-white">
          Select Appointment
        </h3>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevWeek}
          disabled={!canGoBack}
          className="p-1.5 rounded-lg border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous week"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-body font-medium text-white/80">
          {formatWeekRange(weekMonday)}
        </span>

        <button
          type="button"
          onClick={handleNextWeek}
          className="p-1.5 rounded-lg border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
          aria-label="Next week"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 mb-4">
        {DAY_OFFSETS.map((offset, index) => {
          const dateStr = getDayDateStr(weekMonday, offset);
          const daySlots = slotsByDay[dateStr] ?? [];
          const isActive = index === activeDayIndex;

          return (
            <button
              key={offset}
              type="button"
              onClick={() => setActiveDayIndex(index)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl transition-all ${
                isActive
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-small font-semibold">
                {DAY_LABELS[index]}
              </span>
              <span className="text-micro text-inherit opacity-70">
                {formatDayDate(weekMonday, offset)}
              </span>

              {/* Slot count badge */}
              {!loading && (
                <span
                  className={`text-micro font-medium mt-0.5 px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/[0.06] text-white/40"
                  }`}
                >
                  {daySlots.length}
                </span>
              )}

              {/* Active underline */}
              {isActive && (
                <motion.div
                  layoutId="dayTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-400"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Slot grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <Loader2 size={24} className="text-emerald-400 animate-spin" />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-10"
          >
            <p className="text-small text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchSlots(weekMonday)}
              className="text-small font-medium text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40"
            >
              Retry
            </button>
          </motion.div>
        ) : activeSlots.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 py-10"
          >
            <Clock size={24} className="text-white/20" />
            <p className="text-small text-white/40">
              No available slots on this day
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={activeDateStr}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1"
          >
            {activeSlots.map((slot) => {
              const isSelected =
                selectedSlot !== null &&
                selectedSlot.dateTime === slot.dateTime;

              return (
                <motion.button
                  key={slot.dateTime}
                  type="button"
                  onClick={() => handleSelectSlot(slot)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-body font-medium transition-all ${
                    isSelected
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white"
                  }`}
                >
                  {slot.time}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
