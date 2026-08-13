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

// ─── Email (Outlook-style viewer) ────────────────────────────────────────────
export const emailFolders = [
  { id:"inbox",   label:"Inbox",   icon:"Inbox",        unread:3 },
  { id:"sent",    label:"Sent",    icon:"Send",         unread:0 },
  { id:"drafts",  label:"Drafts",  icon:"Drafts",       unread:1 },
  { id:"starred", label:"Starred", icon:"Star",         unread:0 },
  { id:"trash",   label:"Trash",   icon:"Delete",       unread:0 },
]

export const emails = [
  { id:"e1", folderId:"inbox",  from:"Sarah Johnson <sarah@firm.com>",        subject:"Matter 260303 — Document Review Complete",    preview:"I have completed the review of all documents for the building dispute matter...", body:"Dear Team,\n\nI have completed the review of all documents for the building dispute matter (260303). The key findings are attached.\n\nPlease review at your earliest convenience.\n\nBest regards,\nSarah Johnson", date:"2026-08-07T09:15:00", read:false, starred:true,  hasAttachments:true,  to:"admin@legaleaglelms.com" },
  { id:"e2", folderId:"inbox",  from:"Mohammed Al Rashid <m@holdings.ae>",   subject:"RE: Invoice INV-2025-003 — Payment Query",     preview:"Thank you for your email. We have processed the payment and...", body:"Thank you for your email.\n\nWe have processed the payment for Invoice INV-2025-003. Please find the bank transfer confirmation attached.\n\nRegards,\nMohammed Al Rashid\nAl Rashid Holdings", date:"2026-08-07T08:30:00", read:false, starred:false, hasAttachments:true,  to:"admin@legaleaglelms.com" },
  { id:"e3", folderId:"inbox",  from:"Court Registry <registry@courts.ae>",  subject:"Hearing Confirmation — Case CR-2025-001",      preview:"This is to confirm the hearing scheduled for Monday 11 August...", body:"This is to confirm the hearing scheduled for:\n\nCase: CR-2025-001\nDate: Monday, 11 August 2026\nTime: 10:00 AM\nCourt: Dubai Civil Court, Room 4B\n\nPlease ensure all parties are present.", date:"2026-08-06T14:00:00", read:true,  starred:false, hasAttachments:false, to:"admin@legaleaglelms.com" },
  { id:"e4", folderId:"inbox",  from:"Dory Abi Khalil <dory@firm.com>",      subject:"Rental Dispute — Client Meeting Notes",         preview:"Attached are the notes from yesterday's meeting with the client...", body:"Hi,\n\nAttached are the notes from yesterday's meeting with the client regarding the rental dispute (260293).\n\nKey points discussed:\n1. Timeline for filing\n2. Evidence compilation\n3. Settlement options\n\nLet me know your thoughts.\n\nDory", date:"2026-08-06T11:20:00", read:true,  starred:false, hasAttachments:true,  to:"admin@legaleaglelms.com" },
  { id:"e5", folderId:"inbox",  from:"HR System <hr@legaleaglelms.com>",     subject:"Leave Request Approved — Ahmad AlKhalil",       preview:"This is to confirm that the leave request for Ahmad AlKhalil has been approved...", body:"This is to confirm that the leave request for Ahmad AlKhalil (3 days, 10–12 August 2026) has been approved.\n\nPlease update the matter calendar accordingly.", date:"2026-08-05T16:45:00", read:true,  starred:false, hasAttachments:false, to:"admin@legaleaglelms.com" },
  { id:"e6", folderId:"sent",   from:"admin@legaleaglelms.com",              subject:"RE: Invoice INV-2025-002 — Payment Reminder",   preview:"Dear Emily, This is a reminder that Invoice INV-2025-002...", body:"Dear Emily,\n\nThis is a reminder that Invoice INV-2025-002 for AED 8,925 remains partially outstanding.\n\nBalance due: AED 4,925\nDue date: 30 April 2025\n\nPlease arrange payment at your earliest convenience.\n\nKind regards,\nLegal Eagle LMS", date:"2026-08-04T10:00:00", read:true,  starred:false, hasAttachments:false, to:"emily@gmail.com" },
  { id:"e7", folderId:"drafts", from:"admin@legaleaglelms.com",              subject:"Matter 260285 — Corporate Restructuring Update", preview:"Dear Mr. Al Mazrouei, Following our meeting on...", body:"Dear Mr. Al Mazrouei,\n\nFollowing our meeting on 5 August, please find below the updated timeline for the corporate restructuring:\n\n[DRAFT — not yet complete]", date:"2026-08-06T17:00:00", read:true,  starred:false, hasAttachments:false, to:"ceo@km.ae" },
]

// ─── Files (OneDrive-style manager) ───────────────────────────────────────────
export const fileTree = {
  "/": [
    { id:"f1",  name:"Matters",          type:"folder", parentId:null,  size:null,  modified:"2026-08-07T09:00:00", mimeType:null },
    { id:"f2",  name:"Clients",          type:"folder", parentId:null,  size:null,  modified:"2026-08-06T14:00:00", mimeType:null },
    { id:"f3",  name:"Invoices",         type:"folder", parentId:null,  size:null,  modified:"2026-08-05T10:00:00", mimeType:null },
    { id:"f4",  name:"Templates",        type:"folder", parentId:null,  size:null,  modified:"2026-08-01T08:00:00", mimeType:null },
  ],
  "f1": [
    { id:"f10", name:"260303 — Building Dispute", type:"folder", parentId:"f1", size:null, modified:"2026-08-07T09:00:00", mimeType:null },
    { id:"f11", name:"260293 — Rental Dispute",   type:"folder", parentId:"f1", size:null, modified:"2026-08-06T11:00:00", mimeType:null },
    { id:"f12", name:"260285 — Corporate Setup",  type:"folder", parentId:"f1", size:null, modified:"2026-08-05T15:00:00", mimeType:null },
  ],
  "f10": [
    { id:"f20", name:"Brief.pdf",              type:"file", parentId:"f10", size:245760,  modified:"2026-08-07T09:00:00", mimeType:"application/pdf" },
    { id:"f21", name:"Evidence_Bundle.pdf",    type:"file", parentId:"f10", size:1048576, modified:"2026-08-06T16:00:00", mimeType:"application/pdf" },
    { id:"f22", name:"Client_Agreement.docx",  type:"file", parentId:"f10", size:98304,   modified:"2026-08-05T10:00:00", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ],
  "f11": [
    { id:"f23", name:"Lease_Agreement.pdf",    type:"file", parentId:"f11", size:512000,  modified:"2026-08-06T11:00:00", mimeType:"application/pdf" },
    { id:"f24", name:"Correspondence.docx",    type:"file", parentId:"f11", size:65536,   modified:"2026-08-04T09:00:00", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ],
  "f3": [
    { id:"f30", name:"INV-2025-001.pdf", type:"file", parentId:"f3", size:184320, modified:"2026-03-01T10:00:00", mimeType:"application/pdf" },
    { id:"f31", name:"INV-2025-002.pdf", type:"file", parentId:"f3", size:174080, modified:"2026-04-01T10:00:00", mimeType:"application/pdf" },
    { id:"f32", name:"INV-2025-003.pdf", type:"file", parentId:"f3", size:163840, modified:"2026-02-01T10:00:00", mimeType:"application/pdf" },
  ],
  "f4": [
    { id:"f40", name:"LFA_Template.docx",         type:"file", parentId:"f4", size:45056,  modified:"2026-01-15T08:00:00", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { id:"f41", name:"Matter_Opening_Form.docx",   type:"file", parentId:"f4", size:38912,  modified:"2026-01-15T08:00:00", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { id:"f42", name:"Invoice_Template.xlsx",      type:"file", parentId:"f4", size:28672,  modified:"2026-01-15T08:00:00", mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  ],
}

// ─── Activity Timeline (dashboard feed + per-entity history) ─────────────────
export const activityFeed = [
  { id:"a1",  type:"matter_created",   actor:"Sarah Johnson",     entity:"Matter",  entityId:"6a4f9f5e096c2631a41a8193", entityName:"260303 — Building Dispute",    description:"Created new matter",                          createdAt:"2026-08-07T09:15:00" },
  { id:"a2",  type:"invoice_paid",     actor:"System",            entity:"Invoice", entityId:"inv1",                       entityName:"INV-2025-001",                 description:"Invoice marked as paid — AED 15,750",          createdAt:"2026-08-07T08:45:00" },
  { id:"a3",  type:"lead_converted",   actor:"Dory Abi Khalil",   entity:"Lead",    entityId:"l1",                         entityName:"Mohammed Al Rashid",           description:"Lead converted to client",                     createdAt:"2026-08-06T16:30:00" },
  { id:"a4",  type:"task_completed",   actor:"Mashood Rafi",      entity:"Task",    entityId:"t2",                         entityName:"File court documents",         description:"Task marked as completed",                     createdAt:"2026-08-06T14:00:00" },
  { id:"a5",  type:"client_created",   actor:"Ahmad AlKhalil",    entity:"Client",  entityId:"c3",                         entityName:"KM Properties",                description:"New client added",                             createdAt:"2026-08-06T11:20:00" },
  { id:"a6",  type:"timelog_approved", actor:"Sarah Johnson",     entity:"Timelog", entityId:"tl1",                        entityName:"260293 — Rental Dispute",      description:"Time logs approved — 4.5 hrs",                 createdAt:"2026-08-05T17:00:00" },
  { id:"a7",  type:"matter_closed",    actor:"Admin",             entity:"Matter",  entityId:"matter-003",                 entityName:"260285 — Corporate Setup",     description:"Matter closed",                                createdAt:"2026-08-05T15:30:00" },
  { id:"a8",  type:"invoice_created",  actor:"Dory Abi Khalil",   entity:"Invoice", entityId:"inv2",                       entityName:"INV-2025-002",                 description:"Invoice created — AED 8,925",                  createdAt:"2026-08-04T10:00:00" },
  { id:"a9",  type:"lead_followup",    actor:"Ahmad AlKhalil",    entity:"Lead",    entityId:"l2",                         entityName:"Fatima Khalid",                description:"Follow-up added: Sent proposal document",      createdAt:"2026-08-03T14:15:00" },
  { id:"a10", type:"user_login",       actor:"Talha Akhter",      entity:"User",    entityId:"u4",                         entityName:"Talha Akhter",                 description:"Logged in from 192.168.1.45",                  createdAt:"2026-08-07T08:00:00" },
]

// ─── Audit Log (admin — who changed what) ─────────────────────────────────────
export const auditLog = [
  { id:"au1",  actor:"Sarah Johnson",   action:"UPDATE",   module:"Matter",  record:"260303 — Building Dispute",  changes:{ status:{ from:"OPEN", to:"OPEN" }, practiceArea:{ from:"General", to:"Litigation" } },          ip:"192.168.1.20", createdAt:"2026-08-07T09:10:00" },
  { id:"au2",  actor:"System",          action:"UPDATE",   module:"Invoice", record:"INV-2025-001",               changes:{ invoiceStatus:{ from:"Due", to:"Paid" }, paidAmount:{ from:"0", to:"15750" } },                    ip:"system",        createdAt:"2026-08-07T08:45:00" },
  { id:"au3",  actor:"Dory Abi Khalil", action:"CREATE",   module:"Lead",    record:"Robert Chen",               changes:{},                                                                                                  ip:"192.168.1.22", createdAt:"2026-08-06T16:25:00" },
  { id:"au4",  actor:"Dory Abi Khalil", action:"CONVERT",  module:"Lead",    record:"Mohammed Al Rashid → Client",changes:{},                                                                                                  ip:"192.168.1.22", createdAt:"2026-08-06T16:30:00" },
  { id:"au5",  actor:"Mashood Rafi",    action:"UPDATE",   module:"Task",    record:"File court documents",       changes:{ taskStatus:{ from:"In_Progress", to:"Completed" } },                                               ip:"192.168.1.25", createdAt:"2026-08-06T14:00:00" },
  { id:"au6",  actor:"Ahmad AlKhalil",  action:"CREATE",   module:"Client",  record:"KM Properties",             changes:{},                                                                                                  ip:"192.168.1.30", createdAt:"2026-08-06T11:20:00" },
  { id:"au7",  actor:"Sarah Johnson",   action:"APPROVE",  module:"Timelog", record:"260293 — 4.5 hrs",          changes:{},                                                                                                  ip:"192.168.1.20", createdAt:"2026-08-05T17:00:00" },
  { id:"au8",  actor:"Admin",           action:"UPDATE",   module:"Matter",  record:"260285 — Corporate Setup",  changes:{ status:{ from:"OPEN", to:"CLOSED" } },                                                             ip:"192.168.1.1",  createdAt:"2026-08-05T15:30:00" },
  { id:"au9",  actor:"Dory Abi Khalil", action:"CREATE",   module:"Invoice", record:"INV-2025-002",              changes:{},                                                                                                  ip:"192.168.1.22", createdAt:"2026-08-04T10:00:00" },
  { id:"au10", action:"LOGIN",          actor:"Talha Akhter", module:"Auth", record:"Login",                     changes:{},                                                                                                  ip:"192.168.1.45", createdAt:"2026-08-07T08:00:00" },
]

// ─── Timelogs ─────────────────────────────────────────────────────────────────
export const timelogs = [
  { id:"tl1", activity:"Document Review", matter:{id:"6a4f9f5e096c2631a41a8193",title:"260303"}, responsiblePerson:{id:"u1",firstName:"Sarah",lastName:"Johnson"}, totalHours:3.5, billing:3500, revenueStatus:"DRAFT",        entryDate:"2026-08-07", billingType:"Hourly" },
  { id:"tl2", activity:"Client Meeting",  matter:{id:"6a4b80d327dd9e0041129bb5",title:"260293"}, responsiblePerson:{id:"u2",firstName:"Dory",  lastName:"Abi Khalil"}, totalHours:2.0, billing:2000, revenueStatus:"PRE_APPROVAL", entryDate:"2026-08-06", billingType:"Hourly" },
  { id:"tl3", activity:"Court Attendance",matter:{id:"6a4f9f5e096c2631a41a8193",title:"260303"}, responsiblePerson:{id:"u3",firstName:"Mashood",lastName:"Rafi"},      totalHours:6.0, billing:7200, revenueStatus:"APPROVED",      entryDate:"2026-08-05", billingType:"Hourly" },
]

// ─── LFA ──────────────────────────────────────────────────────────────────────
export const lfaItems = [
  { id:"lfa1", lfaTitle:"Corporate Setup LFA", agreementNo:"LFA-001", billingType:"Fixed",  fixedBillingAmount:15000, current:true, agreementDate:"2026-07-01", lfaStatus:"Approved" },
  { id:"lfa2", lfaTitle:"Rental Dispute LFA",  agreementNo:"LFA-002", billingType:"Hourly", fixedBillingAmount:null,  current:true, agreementDate:"2026-07-15", lfaStatus:"Active"   },
]

// ─── Approvals ────────────────────────────────────────────────────────────────
export const taskApprovals = [
  { id:"ta1", taskName:"Review corporate agreement", taskType:"Matter",  assignedTo:{id:"u1",firstName:"Sarah", lastName:"Johnson"},  taskDeadLine:"2026-08-20", taskStatus:"Pending" },
  { id:"ta2", taskName:"File court documents",        taskType:"Hearing", assignedTo:{id:"u2",firstName:"James", lastName:"Williams"}, taskDeadLine:"2026-08-25", taskStatus:"Pending" },
]

export const invoiceApprovals = [
  { id:"inv2", invoiceNo:"INV-2025-002", client:{id:"c2",firstName:"Emily",companyName:""}, matter:{id:"m2",title:"Harper Employment"}, amount:8500, vatAmount:425, taxableAmount:8925, invoiceStatus:"Approval", issueDate:"2026-04-01", dueDate:"2026-04-30" },
]

export const lfaApprovals = [
  { id:"lfa1", lfaTitle:"Corporate Setup LFA", agreementNo:"LFA-001", billingType:"Fixed", fixedBillingAmount:15000, current:true, lfaStatus:"Pending_Approval" },
]

// ─── Budgeting ────────────────────────────────────────────────────────────────
export const costCards = [
  { id:"cc1", name:"Standard Rate Card 2026", description:"Default hourly rates", currency:"AED", active:true, createdAt:"2026-01-01" },
  { id:"cc2", name:"Partner Rate Card 2026",  description:"Partner-level rates",   currency:"AED", active:true, createdAt:"2026-01-01" },
]

export const rateCards = [
  { id:"rc1", designation:"Partner",   hourlyRate:1200, currency:"AED", costCardId:"cc1" },
  { id:"rc2", designation:"Associate", hourlyRate:800,  currency:"AED", costCardId:"cc1" },
  { id:"rc3", designation:"Paralegal", hourlyRate:400,  currency:"AED", costCardId:"cc1" },
]

export const budgetCards = costCards

// ─── Reports (remaining) ──────────────────────────────────────────────────────
export const billedAmountReport = [
  { id:"r1", departmentName:"Litigation",      totalBilled:85000, totalPaid:75000, outstanding:10000 },
  { id:"r2", departmentName:"Corporate",       totalBilled:62000, totalPaid:62000, outstanding:0     },
  { id:"r3", departmentName:"Family Law",      totalBilled:28000, totalPaid:20000, outstanding:8000  },
  { id:"r4", departmentName:"Business Support",totalBilled:15000, totalPaid:12000, outstanding:3000  },
]

export const collectionsReport = [
  { id:"c1", clientName:"Al Rashid Holdings", totalInvoiced:20250, totalPaid:15750, collectionRate:77.8, outstanding:4500, lastPaymentDate:"2026-08-07" },
  { id:"c2", clientName:"Emily Harper",        totalInvoiced:8925,  totalPaid:4000,  collectionRate:44.8, outstanding:4925, lastPaymentDate:"2026-06-15" },
  { id:"c3", clientName:"KM Properties",       totalInvoiced:5250,  totalPaid:0,     collectionRate:0,    outstanding:5250, lastPaymentDate:""           },
]

export const marginErosionReport = [
  { id:"m1", matterTitle:"260303 — Building Dispute", billedAmount:15000, cost:8000, margin:7000, marginRate:46.7, billingType:"Hourly" },
  { id:"m2", matterTitle:"260293 — Rental Dispute",   billedAmount:8500,  cost:5000, margin:3500, marginRate:41.2, billingType:"Hourly" },
  { id:"m3", matterTitle:"260285 — Corporate Setup",  billedAmount:5000,  cost:1500, margin:3500, marginRate:70.0, billingType:"Fixed"  },
]
