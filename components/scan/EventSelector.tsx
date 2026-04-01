"use client";

import { FaTicketAlt, FaStarHalfAlt, FaStar, FaCrown, FaCalendarAlt } from "react-icons/fa";
import { events, type HWBEvent } from "@/lib/data";

const eventIcons: Record<string, React.ReactNode> = {
  conf: <FaTicketAlt />,
  lec1: <FaStarHalfAlt />,
  lec2: <FaStarHalfAlt />,
  lec3: <FaStarHalfAlt />,
  lec4: <FaStarHalfAlt />,
  closing: <FaStar />,
  workshop: <FaCrown />,
};

interface Props {
  onSelect: (event: HWBEvent) => void;
}

export function EventSelector({ onSelect }: Props) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[var(--maroon)] font-bold mb-2">
        Select Event to Scan
      </h2>
      <p className="text-sm text-[var(--gray)] mb-6">
        Choose the event you are currently checking attendees into.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event)}
            className="text-left bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-[var(--maroon)] hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[var(--cream)] text-[var(--maroon)] flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-[var(--maroon)] group-hover:text-white transition-colors">
                {eventIcons[event.id] ?? <FaCalendarAlt />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 text-sm leading-tight mb-1">
                  {event.name}
                </div>
                <div className="text-xs text-[var(--gray)]">{event.date} · {event.time}</div>
                <div className="text-xs text-[#aaa] mt-0.5">{event.venue}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
