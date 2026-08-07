/**
 * data/static.ts — ALL static data for VITE_USE_STATIC_DATA=true mode.
 *
 * This is the ONLY file to update when changing static fixtures.
 * When USE_STATIC_DATA=false, this file is tree-shaken out of the bundle.
 *
 * Structure:
 *   auth.*       — signin, menu, permissions
 *   matters.*    — matter list
 *   leads.*      — lead list
 *   clients.*    — client list
 *   billing.*    — invoice list
 *   dashboard.*  — KPI counts + chart data
 *   notifications.* — notification list
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  credentials: {
    email:    "admin@legaleagle.com",
    password: "password",
  },

  user: {
    id:              "6909da660141ea71b0b25974",
    firstName:       "Talha",
    lastName:        "Akhter",
    email:           "admin@legaleagle.com",
    phone:           "3342137306",
    companyUserType: "ATTORNEY",
    accessScope:     "6465b4c27e06f92d902b4ed3",
    token:           "static-jwt-token",
    active:          true,
    hod:             false,
    backEntry:       false,
    leadSourceEntry: true,
    practiceAreaEntry: false,
    departmentInvoiceApproval: false,
    departmentActivitiesReview: false,
    departmentActivitiesReviewAndApproval: false,
    manageClientCredit: false,
    matterStopWorking: false,
    department: {
      id:      "6465b87ac708244ad0cccdf3",
      name:    "Business Support",
      status:  true,
      hodName: "Sandeep Devanda",
      hodId:   "6465b4c37e06f92d902b4ed5",
    },
  },

  // Navigation menu — matches shape from GET /api/user/get/access/menu
  // When USE_STATIC_DATA=true this drives both the sidebar AND permissions
  menu: [
    { menuId:"622846cedae79c0ddde32783", menuName:"Dashboard",   url:"/dashboard",      seqno:1, menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
    { menuId:"6213228c34cb920eda486452", menuName:"Leads",        url:"/leads",          seqno:2, menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
    { menuId:"621c632b24c55c16d05d512d", menuName:"Clients",      url:"/clients",        seqno:3, menuIcon:null, accessPermission:{edit:true, delete:false, visible:true, add:false}, submenu:[] },
    { menuId:"622846cedae79c0ddde32784", menuName:"Matters",      url:"/matters",        seqno:4, menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
    { menuId:"622846cedae79c0ddde32785", menuName:"Billing",      url:"/billings",       seqno:5, menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
    { menuId:"622846cedae79c0ddde32786", menuName:"Tasks",        url:"/tasks",          seqno:6, menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
    { menuId:"6336c61b338b3339ca2b5e53", menuName:"Time Logs",    url:"/time-log-entries",seqno:7,menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
    { menuId:"622846cedae79c0ddde32787", menuName:"Reports",      url:"/reports/wip",    seqno:8, menuIcon:null, accessPermission:{edit:true, delete:false, visible:true, add:false}, submenu:[] },
    { menuId:"622846cedae79c0ddde32789", menuName:"Admin",        url:"/admin/users",    seqno:9, menuIcon:null, accessPermission:{edit:true, delete:true,  visible:true, add:true},  submenu:[] },
  ],

  groups: [],

  notifications: [
    { id:"n1", title:"Task for review has been assigned to you",  notifyId:"6909da660141ea71b0b25974", status:true,  createdAt:"2026-05-13 17:50:06" },
    { id:"n2", title:"Matter No 260205 — Court Date Reminder",    notifyId:"6909da660141ea71b0b25974", status:true,  createdAt:"2026-05-15 13:08:42" },
    { id:"n3", title:"Invoice INV-2025-003 is overdue",           notifyId:"6909da660141ea71b0b25974", status:false, createdAt:"2026-05-18 18:24:30" },
  ],
}

// ─── Matters ──────────────────────────────────────────────────────────────────
export const matters = [
  {
    id:"6a4f9f5e096c2631a41a8193", matterId:"6a4f9f51096c2631a41a8113",
    title:"260303", practiceArea:"General", description:"Building dispute",
    billingType:"Hourly", lawyers:"Mashood Rafi", status:"OPEN",
    clientMini:{ id:"6a4f9ef8096c2631a41a80a3", clientId:"6a4f9ef8096c2631a41a80a2", clientType:"COMPANY", firstName:"Jawad & Sons Corporation", companyName:"Jawad & Sons Corporation" },
    createdAt:"2026-07-09 17:17:05", matterSubject:"Building dispute", partyOpposing:[], subMattersList:[],
  },
  {
    id:"6a4b80d327dd9e0041129bb5", matterId:"6a4b80c627dd9e0041129bb3",
    title:"260293", practiceArea:"Rental", description:"Rental Dispute Scope of work",
    billingType:"Hourly", lawyers:"Dory Abi Khalil", status:"OPEN",
    clientMini:{ id:"6a4b809e27dd9e0041129b92", clientId:"6a4b809e27dd9e0041129b91", clientType:"PERSON", firstName:"Muhammad Asher Rahman", companyName:"" },
    createdAt:"2026-07-06 14:17:42", matterSubject:"Rental Dispute", partyOpposing:[], subMattersList:[],
  },
  {
    id:"matter-003", matterId:"matter-003",
    title:"260285", practiceArea:"Corporate", description:"Company restructuring advisory",
    billingType:"Fixed", lawyers:"Ahmad AlKhalil", status:"OPEN",
    clientMini:{ id:"c3", clientId:"c3", clientType:"COMPANY", firstName:"Al Rashid Holdings", companyName:"Al Rashid Holdings" },
    createdAt:"2026-06-20 09:00:00", matterSubject:"Corporate restructuring", partyOpposing:[], subMattersList:[],
  },
]

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = [
  { id:"l1", firstName:"Mohammed", lastName:"Al Rashid", companyName:"Al Rashid Holdings", leadType:"COMPANY", currentStatus:"NEW", email:"m@holdings.ae", phone:"+971501234567", practiceArea:{id:"pa1",name:"Corporate"}, createdAt:"2025-01-15" },
  { id:"l2", firstName:"Fatima",   lastName:"Khalid",    companyName:"",                  leadType:"PERSON",  currentStatus:"FOLLOW_UP", email:"fatima@gmail.com", phone:"+971509876543", practiceArea:{id:"pa2",name:"Family Law"}, createdAt:"2025-02-10" },
  { id:"l3", firstName:"Robert",   lastName:"Chen",      companyName:"Chen Enterprises",  leadType:"COMPANY", currentStatus:"PROPOSAL",  email:"r@chen.com", phone:"+971555123456", practiceArea:{id:"pa3",name:"Commercial"}, createdAt:"2025-03-22" },
]

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = [
  { id:"c1", firstName:"Mohammed", lastName:"Al Rashid", companyName:"Al Rashid Holdings", clientType:"COMPANY", email:"m@holdings.ae", phone:"+971501234567", active:true },
  { id:"c2", firstName:"Emily",    lastName:"Harper",    companyName:"",                  clientType:"PERSON",  email:"emily@gmail.com", phone:"+971507654321", active:true },
  { id:"c3", firstName:"Khalid",   lastName:"Al Mazrouei", companyName:"KM Properties",  clientType:"COMPANY", email:"ceo@km.ae", phone:"+971556789012", active:true },
]

// ─── Billing ──────────────────────────────────────────────────────────────────
export const invoices = [
  { id:"inv1", invoiceNo:"INV-2025-001", matter:{id:"m1",title:"Al Rashid"}, client:{id:"c1",companyName:"Al Rashid Holdings"}, billingType:"Fixed", amount:15000, vatAmount:750, taxableAmount:15750, paidAmount:15750, balanceAmount:0, invoiceStatus:"Paid", issueDate:"2025-03-01", dueDate:"2025-03-31" },
  { id:"inv2", invoiceNo:"INV-2025-002", matter:{id:"m2",title:"Harper"},    client:{id:"c2",firstName:"Emily"},                billingType:"Hourly",amount:8500,  vatAmount:425,  taxableAmount:8925,  paidAmount:4000,  balanceAmount:4925,  invoiceStatus:"Partially_Paid", issueDate:"2025-04-01", dueDate:"2025-04-30" },
  { id:"inv3", invoiceNo:"INV-2025-003", matter:{id:"m1",title:"Al Rashid"}, client:{id:"c1",companyName:"Al Rashid Holdings"}, billingType:"Fixed", amount:5000,  vatAmount:250,  taxableAmount:5250,  paidAmount:0,     balanceAmount:5250,  invoiceStatus:"Overdue", issueDate:"2025-02-01", dueDate:"2025-02-28" },
]

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = [
  { id:"t1", taskName:"Review corporate agreement", priority:"High",   taskStatus:"Pending",     taskDeadLine:"2025-06-20", assignedTo:{id:"u1",firstName:"Sarah",lastName:"Johnson"} },
  { id:"t2", taskName:"File court documents",       priority:"Normal", taskStatus:"In_Progress", taskDeadLine:"2025-06-25", assignedTo:{id:"u2",firstName:"James",lastName:"Williams"} },
  { id:"t3", taskName:"Client onboarding — KM",     priority:"Low",    taskStatus:"Completed",   taskDeadLine:"2025-06-10", assignedTo:{id:"u3",firstName:"Priya",lastName:"Sharma"} },
]

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboard = {
  counts: {
    totalLeads:   42,
    openLeads:    18,
    totalMatters: 31,
    openMatters:  19,
    pendingTasks: 7,
    overdueTasks: 2,
  },
  matterHistory: [
    { month:"Jan", count:4 }, { month:"Feb", count:6 },
    { month:"Mar", count:5 }, { month:"Apr", count:8 },
    { month:"May", count:7 }, { month:"Jun", count:9 },
  ],
  revenue: [
    { month:"Jan", fixedFees:35000, timelogs:12000 },
    { month:"Feb", fixedFees:28000, timelogs:15000 },
    { month:"Mar", fixedFees:42000, timelogs:18000 },
  ],
  timelogSummary: [
    { category:"Litigation", hours:120 },
    { category:"Corporate",  hours:85  },
    { category:"Advisory",   hours:60  },
  ],
  upcomingHearings: [
    { caseNo:"CR-2025-001", matterTitle:"Al Rashid Corporate", hearingDate:"Today",    hearingTime:"10:00 AM" },
    { caseNo:"ED-2025-012", matterTitle:"Harper Employment",   hearingDate:"Tomorrow", hearingTime:"02:30 PM" },
  ],
}

// ─── Lookup data ──────────────────────────────────────────────────────────────
export const lookups = {
  practiceAreas: [
    { id:"pa1", name:"Corporate" },    { id:"pa2", name:"Family Law" },
    { id:"pa3", name:"Commercial" },   { id:"pa4", name:"Litigation" },
    { id:"pa5", name:"Rental" },       { id:"pa6", name:"Criminal" },
    { id:"pa7", name:"Labour" },       { id:"pa8", name:"IP" },
  ],
  leadSources: [
    { id:"ls1", name:"Referral" }, { id:"ls2", name:"Website" },
    { id:"ls3", name:"LinkedIn" }, { id:"ls4", name:"Cold Call" },
    { id:"ls5", name:"Walk-in"  },
  ],
  departments: [
    { id:"d1", name:"Litigation" }, { id:"d2", name:"Corporate" },
    { id:"d3", name:"Family Law" }, { id:"d4", name:"Business Support" },
  ],
  designations: [
    { id:"dg1", name:"Partner" },   { id:"dg2", name:"Associate" },
    { id:"dg3", name:"Paralegal" }, { id:"dg4", name:"Trainee" },
    { id:"dg5", name:"Lawyer" },
  ],
  users: [
    { id:"u1", firstName:"Sarah",  lastName:"Johnson",     email:"sarah@firm.com",  companyUserType:"ATTORNEY",    active:true },
    { id:"u2", firstName:"James",  lastName:"Williams",    email:"james@firm.com",  companyUserType:"ATTORNEY",    active:true },
    { id:"u3", firstName:"Priya",  lastName:"Sharma",      email:"priya@firm.com",  companyUserType:"NONATTORNEY", active:true },
    { id:"u4", firstName:"Talha",  lastName:"Akhter",      email:"talha@firm.com",  companyUserType:"ATTORNEY",    active:true },
  ],
}
