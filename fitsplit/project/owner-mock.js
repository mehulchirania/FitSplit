// Mock data for owner dashboard redesign
window.MOCK_OWNER = (() => {
  const today = new Date();
  const dow = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = today.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  function daysAgo(d) {
    const x = new Date(today);
    x.setDate(today.getDate() - d);
    return x.toISOString().slice(0, 10);
  }
  function daysFromNow(d) {
    const x = new Date(today);
    x.setDate(today.getDate() + d);
    return x.toISOString().slice(0, 10);
  }

  return {
    gym: {
      name: "Titan Strength",
      branch: "Bandra West",
      city: "Mumbai"
    },
    owner: {
      firstName: "Priya",
      avatarInitials: "PN",
      role: "Owner"
    },
    todayLabel: `${dow} · ${dateLabel}`,

    // Aggregate KPIs
    kpis: {
      totalMembers: 247,
      activeMembers: 218,
      inGymNow: 14,
      capacity: 35,
      noPlanCount: 23,
      pendingPayments: 7,
      expiringIn30d: 18,
      expiredOverdue: 4,
      revenueMTD: 432500,
      revenueLastMonth: 389200,
      currency: "₹",
      newJoinsThisWeek: 6
    },

    // Unified action queue
    actions: [
      { id: "a1", kind: "expired", who: "Rohan Mehta", whoId: "rohan_m", subtitle: "Annual Pro lapsed 4 days ago", urgency: 3, age: 4, value: 14999 },
      { id: "a2", kind: "expired", who: "Yash Bhatt", whoId: "yashb", subtitle: "Quarterly Strength lapsed 2 days ago", urgency: 3, age: 2, value: 5499 },
      { id: "a3", kind: "payment", who: "Ananya Bose", whoId: "ananya.b", subtitle: "Half-year PT · ₹18,500 · Cash", urgency: 3, age: 1, value: 18500 },
      { id: "a4", kind: "payment", who: "Aryan Nair", whoId: "aryan", subtitle: "Annual + PT · ₹22,000 · UPI", urgency: 2, age: 0, value: 22000 },
      { id: "a5", kind: "expiring", who: "Devansh Joshi", whoId: "dev_joshi", subtitle: "Quarterly · expires in 5 days", urgency: 2, age: 0, value: 5499 },
      { id: "a6", kind: "expiring", who: "Aditi Rao", whoId: "aditi.r", subtitle: "Annual Pro · expires in 9 days", urgency: 2, age: 0, value: 14999 },
      { id: "a7", kind: "noplan", who: "Pari Saxena", whoId: "pari", subtitle: "Joined 11 days ago · goal: lose fat", urgency: 2, age: 11 },
      { id: "a8", kind: "noplan", who: "Veer Tiwari", whoId: "veer.t", subtitle: "Joined 8 days ago · goal: build muscle", urgency: 2, age: 8 },
      { id: "a9", kind: "noplan", who: "Reyansh Pillai", whoId: "reyansh", subtitle: "Joined 6 days ago · goal: athletic perf.", urgency: 1, age: 6 },
      { id: "a10", kind: "noplan", who: "Karthik Reddy", whoId: "karthik.r", subtitle: "Joined 4 days ago · goal: endurance", urgency: 1, age: 4 },
      { id: "a11", kind: "expiring", who: "Riya Verma", whoId: "riya.v", subtitle: "Monthly · expires in 14 days", urgency: 1, age: 0, value: 1999 },
      { id: "a12", kind: "payment", who: "Tanvi Shetty", whoId: "tanvi.s", subtitle: "Monthly · ₹1,999 · Card", urgency: 1, age: 0, value: 1999 }
    ],

    // Notifications feed
    notifications: [
      { id: "n1", kind: "joined", who: "Karthik Reddy", at: "2h ago", icon: "user" },
      { id: "n2", kind: "payment", who: "Ananya Bose", at: "3h ago", icon: "cash", note: "submitted cash payment of ₹18,500" },
      { id: "n3", kind: "session_done", who: "Aanya Sharma", at: "4h ago", note: "completed Push B (45 min)" },
      { id: "n4", kind: "pr", who: "Ishaan Kapoor", at: "5h ago", note: "hit a new bench PR · 95kg × 5" },
      { id: "n5", kind: "joined", who: "Veer Tiwari", at: "yesterday", icon: "user" },
      { id: "n6", kind: "expiring", who: "Devansh Joshi", at: "yesterday", note: "membership expiring in 5 days" },
      { id: "n7", kind: "feedback", who: "Sara D'Souza", at: "2d ago", note: "left a 5-star review for Coach Priya" }
    ],

    // Today's in-gym
    inGymRightNow: [
      { id: "ig1", name: "Aanya Sharma", initials: "AS", since: 32, trainer: "Priya N." },
      { id: "ig2", name: "Devansh Joshi", initials: "DJ", since: 18 },
      { id: "ig3", name: "Vihaan Gupta", initials: "VG", since: 45, trainer: "Vikram I." },
      { id: "ig4", name: "Sara D'Souza", initials: "SD", since: 12 },
      { id: "ig5", name: "Reyansh Pillai", initials: "RP", since: 8 },
      { id: "ig6", name: "Myra Sinha", initials: "MS", since: 25 },
      { id: "ig7", name: "Yash Bhatt", initials: "YB", since: 50 }
    ],

    // Today's PT sessions
    ptSessions: [
      { id: "pt1", time: "06:30", trainer: "Priya N.", member: "Aanya Sharma", focus: "Bench technique", status: "completed" },
      { id: "pt2", time: "08:00", trainer: "Vikram I.", member: "Vihaan Gupta", focus: "Squat 1RM test", status: "in_progress" },
      { id: "pt3", time: "10:00", trainer: "Priya N.", member: "Sara D'Souza", focus: "Mobility flow", status: "upcoming" },
      { id: "pt4", time: "17:30", trainer: "Vikram I.", member: "Aryan Nair", focus: "Deadlift form", status: "upcoming" },
      { id: "pt5", time: "19:00", trainer: "Priya N.", member: "Ishaan Kapoor", focus: "Push day coaching", status: "upcoming" }
    ],

    // Floor zones occupancy
    floor: [
      { zone: "Free weights", current: 6, capacity: 10 },
      { zone: "Cable & machines", current: 4, capacity: 8 },
      { zone: "Cardio", current: 2, capacity: 6 },
      { zone: "Functional area", current: 2, capacity: 6 },
      { zone: "PT room", current: 0, capacity: 2 },
      { zone: "Studio", current: 0, capacity: 12 }
    ],

    // Attendance trend (last 14 days)
    attendanceTrend: [12, 18, 22, 16, 14, 8, 6, 24, 28, 19, 17, 14, 22, 27],

    // Notice board
    notices: [
      { id: "no1", title: "Annual fitness check-up — book your slot", body: "Free health-check for all members on 31 May. Sign-ups close 28 May.", date: "2 days ago", pinned: true },
      { id: "no2", title: "New cable stack arriving Tuesday", body: "PT room briefly closed 11am – 1pm for installation.", date: "5 days ago" },
      { id: "no3", title: "Holi closure on 14 March", body: "Gym closed all day. Reopens 15 March at 6am.", date: "2 weeks ago" }
    ],

    // Membership composition
    membershipMix: [
      { plan: "Annual Pro", count: 86, color: "var(--brand)" },
      { plan: "Quarterly", count: 64, color: "var(--accent)" },
      { plan: "Half-year PT", count: 41, color: "var(--gold)" },
      { plan: "Monthly", count: 38, color: "var(--danger)" },
      { plan: "Day passes", count: 18, color: "var(--text-soft)" }
    ]
  };
})();
