"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import type { PTSession } from "@/types/domain";

export function PTCalendar({ sessions }: { sessions: PTSession[] }) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);

  const events = sessions.map((session) => {
    // If it's a multi-day plan, we span the dates.
    // FullCalendar expects 'end' to be exclusive, so we add 1 day to planEndDate if it exists.
    let endStr = session.planEndDate;
    if (session.planEndDate) {
      const endDate = new Date(session.planEndDate);
      endDate.setDate(endDate.getDate() + 1);
      endStr = endDate.toISOString().slice(0, 10);
    }

    return {
      id: session.id,
      title: `${session.memberName ?? "Member"} (${session.trainerName ?? "Trainer"})`,
      start: session.planStartDate ?? session.scheduledAt,
      end: endStr,
      allDay: true,
      backgroundColor: session.status === "active" ? "var(--accent)" : "var(--bg-layer-2)",
      borderColor: session.status === "active" ? "var(--accent)" : "var(--border)",
      textColor: session.status === "active" ? "white" : "var(--text-main)",
      extendedProps: {
        status: session.status,
        memberId: session.memberId
      }
    };
  });

  const handleEventClick = (info: EventClickArg) => {
    const { status, memberId } = info.event.extendedProps;
    if (status === "active") {
      router.push(`/owner/training/session/${info.event.id}`);
    } else {
      router.push(`/owner/members/${memberId}`);
    }
  };

  return (
    <div className="pt-calendar-wrapper" style={{ 
      padding: "16px", 
      background: "var(--bg-layer-1)", 
      borderRadius: "12px",
      border: "1px solid var(--border)",
      marginTop: "24px" 
    }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek"
        }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        eventDisplay="block"
      />
    </div>
  );
}
