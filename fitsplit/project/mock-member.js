// Mock data for the member's personal dashboard.
window.MOCK_MEMBER = (() => {
  const today = new Date();
  const dow = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = today.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return {
    id: "m042",
    firstName: "Aanya",
    fullName: "Aanya Sharma",
    avatarInitials: "AS",
    gymName: "Titan Strength · Bandra",
    gymPhone: "+91 98765 12345",
    membershipStatus: "active",
    membershipExpiry: "2026-08-12",
    daysToExpiry: 76,
    weeklyStreak: 7,
    todayLabel: `${dow} · ${dateLabel}`,
    daysTrainedThisWeek: 3,
    weeklyTarget: 4,
    setsThisWeek: 47,
    setsLastWeek: 39,
    liftLogsTotal: 412,
    bestSet: { exercise: "Bench Press", weight: 52.5, reps: 5 },

    coachNote: {
      from: "Priya Nair",
      avatar: "PN",
      message: "Aanya — slight pause at the bottom of every bench rep today. Don't bounce. Form > reps. You've got this 💪",
      sentAt: "Today, 7:42 AM",
      isUnread: true
    },

    // Today's session
    program: {
      title: "Hypertrophy 12wk",
      week: 4,
      day: 2,
      dayLabel: "Day B · Push",
      durationMin: 55,
      exercises: [
        { id: "e1", name: "Bench Press", sets: 4, reps: "5–8", lastWeight: 50, suggested: 52.5, muscleGroup: "Chest" },
        { id: "e2", name: "Incline DB Press", sets: 3, reps: "8–10", lastWeight: 16, suggested: 18, muscleGroup: "Chest" },
        { id: "e3", name: "Overhead Press", sets: 3, reps: "6–8", lastWeight: 25, suggested: 27.5, muscleGroup: "Shoulders" },
        { id: "e4", name: "Lateral Raise", sets: 4, reps: "12–15", lastWeight: 8, suggested: 8, muscleGroup: "Shoulders" },
        { id: "e5", name: "Triceps Pushdown", sets: 3, reps: "10–12", lastWeight: 22, suggested: 25, muscleGroup: "Triceps" },
        { id: "e6", name: "Overhead Tricep Ext.", sets: 3, reps: "10–12", lastWeight: 12, suggested: 12, muscleGroup: "Triceps" }
      ]
    },

    // Week strip (Mon-Sun)
    weekStrip: [
      { day: "M", date: 25, kind: "lift", label: "Pull A" },
      { day: "T", date: 26, kind: "lift", label: "Push B" },
      { day: "W", date: 27, kind: "rest" },
      { day: "T", date: 28, kind: "lift", label: "Legs A" },
      { day: "F", date: 29, kind: "today", label: "Push B" },
      { day: "S", date: 30, kind: "planned", label: "Pull B" },
      { day: "S", date: 31, kind: "rest" }
    ],

    // Body metrics
    body: {
      weightKg: 56.2,
      weightChange: -0.4,
      height: 165,
      bmi: 20.6,
      bodyFat: 22.1,
      sleepHrs: 7.1
    },

    // Macros today
    macros: {
      kcal: { actual: 1280, target: 1800 },
      protein: { actual: 78, target: 110 },
      carbs: { actual: 150, target: 210 },
      fat: { actual: 38, target: 55 }
    },

    // Recent PRs
    prs: [
      { exercise: "Bench Press", weight: 50, reps: 5, when: "Yesterday" },
      { exercise: "Goblet Squat", weight: 22.5, reps: 8, when: "3d ago" },
      { exercise: "Romanian DL", weight: 45, reps: 6, when: "1w ago" }
    ],

    // Notices
    notices: [
      { title: "Annual fitness check-up — book your slot", date: "30 May", tone: "info" },
      { title: "Holi closure on 14 March", date: "1 Mar", tone: "warn" }
    ],

    // Upcoming PT
    upcomingPT: {
      trainer: "Priya Nair",
      avatar: "PN",
      when: "Tomorrow, 6:30 AM",
      duration: 45,
      focus: "Bench technique"
    }
  };
})();
