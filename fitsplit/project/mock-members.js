// Shared mock data for FitSplit members redesign
window.MOCK_MEMBERS = (() => {
  const names = [
    ["Aanya Sharma", "aanya.s", "Build muscle", "Priya Nair"],
    ["Rohan Mehta", "rohan_m", "Lose fat", "Vikram Iyer"],
    ["Ishaan Kapoor", "ishaan.k", "Powerlifting", "Vikram Iyer"],
    ["Meera Iyer", "meera", "General fitness", "Priya Nair"],
    ["Karthik Reddy", "karthik.r", "Endurance", null],
    ["Ananya Bose", "ananya.b", "Build muscle", "Priya Nair"],
    ["Devansh Joshi", "dev_joshi", "Lose fat", "Vikram Iyer"],
    ["Saanvi Patel", "saanvi.p", "Tone up", "Priya Nair"],
    ["Arjun Singh", "arjun", "Athletic perf.", "Vikram Iyer"],
    ["Riya Verma", "riya.v", "Posture", null],
    ["Vihaan Gupta", "vihaan_g", "Build muscle", "Vikram Iyer"],
    ["Diya Chawla", "diya.c", "General fitness", "Priya Nair"],
    ["Aarav Khanna", "aarav", "Lose fat", null],
    ["Myra Sinha", "myra", "Strength", "Priya Nair"],
    ["Kabir Malhotra", "kabir.m", "Cardio health", "Vikram Iyer"],
    ["Aditi Rao", "aditi.r", "Build muscle", "Priya Nair"],
    ["Yash Bhatt", "yashb", "Powerlifting", "Vikram Iyer"],
    ["Sara D'Souza", "sara.d", "Yoga + strength", "Priya Nair"],
    ["Reyansh Pillai", "reyansh", "Athletic perf.", null],
    ["Tanvi Shetty", "tanvi.s", "Tone up", "Priya Nair"],
    ["Aryan Nair", "aryan", "Endurance", "Vikram Iyer"],
    ["Pari Saxena", "pari", "Lose fat", "Priya Nair"],
    ["Veer Tiwari", "veer.t", "Build muscle", null],
    ["Anaisha Kohli", "anaisha", "General fitness", "Priya Nair"]
  ];

  const packages = [
    { name: "Quarterly Strength", months: 3 },
    { name: "Annual Pro", months: 12 },
    { name: "Monthly Drop-in", months: 1 },
    { name: "Half-year PT", months: 6 },
    { name: "Annual + PT", months: 12 }
  ];

  const programs = [
    "PPL · 6 day",
    "Upper/Lower · 4 day",
    "Bro split · 5 day",
    "Full body · 3 day",
    "Hypertrophy 12wk",
    "Beginner ramp"
  ];

  function daysFromNow(d) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  }

  return names.map((n, i) => {
    const [fullName, username, goal, trainer] = n;
    const initials = fullName.split(" ").map((p) => p[0]).slice(0, 2).join("");
    // distribute states realistically
    const isActive = i % 9 !== 4; // ~11% suspended
    const hasPlan = i % 5 !== 0 && i % 7 !== 1; // ~30% no plan
    const pkg = packages[i % packages.length];

    // membership state: expired/expiring/active
    let expiryOffset;
    if (i % 11 === 3) expiryOffset = -14; // expired
    else if (i % 6 === 2) expiryOffset = 8; // expiring soon
    else if (i % 6 === 5) expiryOffset = 21; // expiring soon-ish
    else expiryOffset = 60 + (i % 200);
    const membershipStatus =
      expiryOffset < 0
        ? "expired"
        : expiryOffset <= 21
          ? "expiring_soon"
          : "active";

    return {
      id: `m${String(i + 1).padStart(3, "0")}`,
      fullName,
      username,
      avatarInitials: initials,
      goal,
      assignedTrainer: trainer,
      isActive,
      hasPlan,
      program: hasPlan ? programs[i % programs.length] : null,
      currentPackageName: pkg.name,
      membershipStatus,
      membershipEndDate: daysFromNow(expiryOffset),
      daysToExpiry: expiryOffset,
      joinedAt: daysFromNow(-(30 + i * 17)),
      lastVisit: daysFromNow(-(i % 13))
    };
  });
})();

window.MOCK_PROGRAMS = [
  { id: "p1", title: "PPL · 6 day" },
  { id: "p2", title: "Upper/Lower · 4 day" },
  { id: "p3", title: "Full body · 3 day" },
  { id: "p4", title: "Hypertrophy 12wk" },
  { id: "p5", title: "Beginner ramp" }
];

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}
function relativeDays(days) {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
window.fmtDate = fmtDate;
window.fmtDateShort = fmtDateShort;
window.relativeDays = relativeDays;
