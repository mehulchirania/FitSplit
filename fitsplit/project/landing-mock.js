// Mock data for landing-page redesign
window.LANDING_MOCK = {
  brand: { name: "FitSplit" },

  nav: ["Product", "Pricing", "Customers", "Resources"],

  hero: {
    eyebrow: "Workout delivery for modern gyms",
    h1: "Structured workouts.",
    h1Accent: "Delivered to every member.",
    sub: "FitSplit gives gym owners, trainers, and members one focused workspace to assign plans, guide sessions, and track progress.",
    ctaPrimary: "Start free trial",
    ctaSecondary: "Watch a 90-sec demo"
  },

  proof: [
    { value: "248", label: "gyms running on FitSplit", small: "across India" },
    { value: "86%", label: "weekly completion rate", small: "vs 41% industry avg" },
    { value: "2 min", label: "to assign a plan", small: "from catalog to delivery" },
    { value: "32k", label: "workouts delivered", small: "every month" }
  ],

  features: [
    {
      icon: "dumbbell",
      title: "Assign workouts faster",
      body: "Pick a saved split, pick a member, done. Programs sync to the member app instantly.",
      tag: "Owners & trainers"
    },
    {
      icon: "calendar",
      title: "Keep training structured",
      body: "Members get a clear weekly plan and today's session, not scattered notes or chat messages.",
      tag: "Members"
    },
    {
      icon: "chart",
      title: "Track every set",
      body: "Lift logs, progressive overload hints, body metrics, and macros — all in one place.",
      tag: "Members & coaches"
    },
    {
      icon: "users",
      title: "Coordinate the floor",
      body: "Live floor map, in-gym roster, PT schedule, and renewals — the owner sees everything.",
      tag: "Owners"
    }
  ],

  steps: [
    { n: "01", label: "Build your library", body: "Reusable workout splits, exercises, and program templates." },
    { n: "02", label: "Assign in seconds", body: "Pick a plan for a member; they get it instantly in the app." },
    { n: "03", label: "Members follow along", body: "Today's session, exercise targets, and check-offs on mobile." },
    { n: "04", label: "Track the floor", body: "Renewals, attendance, payments — at a glance." }
  ],

  testimonial: {
    quote: "FitSplit gave our trainers one tool to deliver structured workouts and track every member's progress. Renewals went up 22% in the first quarter.",
    author: "Priya Nair",
    role: "Owner · Titan Strength · Bandra"
  },

  partners: ["TITAN STRENGTH", "SRI SHAKTHI HANUMAN GYM", "IRON HOUSE FITNESS", "PRANA STUDIOS", "BODY LAB", "AXIS GYM"],

  pricing: {
    title: "Pay for what you use.",
    sub: "Per-member pricing. No setup fee. Cancel any time.",
    plans: [
      { name: "Starter", priceMonthly: 49, priceUnit: "₹ per member / month", tagline: "Up to 100 members", features: ["Member app", "Workout library", "Owner dashboard", "Email support"] },
      { name: "Studio", priceMonthly: 39, priceUnit: "₹ per member / month", tagline: "101–500 members · most popular", features: ["Everything in Starter", "Multi-trainer access", "Floor load map", "Payment requests", "Priority support"], featured: true },
      { name: "Enterprise", priceMonthly: null, priceUnit: "Custom pricing", tagline: "500+ members & multi-branch", features: ["Everything in Studio", "SSO + custom roles", "Multi-branch view", "Dedicated success", "Custom integrations"] }
    ]
  },

  faq: [
    { q: "How long does setup take?", a: "Most gyms are live in under a week. Import your member list, build your first 2–3 program templates, and you're delivering." },
    { q: "Do you support mobile apps?", a: "Yes — native-feel web apps for members and trainers. PWA install works on iOS and Android." },
    { q: "Can I migrate from Google Sheets / WhatsApp?", a: "We import members from CSV. Programs are quick to rebuild once and reused forever." },
    { q: "Is there a free trial?", a: "14 days, no card required. Add as many members as you want during trial." }
  ]
};
