import React, { useState, useCallback } from "react";

// ─── colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117",
  surface: "#1a1d27",
  card: "#20232f",
  border: "#2e3347",
  accent: "#4f8ef7",
  accentDark: "#3a6fd8",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  muted: "#6b7280",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  tag: "#2d3a55",
};

const s = {
  app: { display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter',system-ui,sans-serif", color: C.text, fontSize: 14 },
  sidebar: { width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "24px 0", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 },
  logo: { padding: "0 20px 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 8 },
  logoTitle: { fontSize: 15, fontWeight: 700, color: C.accent, lineHeight: 1.3 },
  logoSub: { fontSize: 11, color: C.muted, marginTop: 3 },
  navItem: (active) => ({ padding: "9px 20px", cursor: "pointer", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent", background: active ? "rgba(79,142,247,0.08)" : "transparent", color: active ? C.accent : C.textDim, fontSize: 13, fontWeight: active ? 600 : 400, transition: "all .15s" }),
  main: { flex: 1, padding: 28, overflowY: "auto" },
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  pageDesc: { color: C.muted, marginBottom: 24, fontSize: 13 },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 16, color: C.text },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  label: { display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: .4 },
  input: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 72 },
  btn: (variant = "primary") => ({
    padding: "8px 18px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    background: variant === "primary" ? C.accent : variant === "success" ? C.green : variant === "danger" ? C.red : C.surface,
    color: variant === "ghost" ? C.textDim : "#fff",
  }),
  badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color === "green" ? "rgba(34,197,94,.15)" : color === "amber" ? "rgba(245,158,11,.15)" : color === "red" ? "rgba(239,68,68,.15)" : "rgba(79,142,247,.15)", color: color === "green" ? C.green : color === "amber" ? C.amber : color === "red" ? C.red : C.accent }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: .5, borderBottom: `1px solid ${C.border}` },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${C.border}` },
  tag: { display: "inline-block", background: C.tag, color: C.accent, borderRadius: 4, padding: "2px 7px", fontSize: 11, marginRight: 4, marginBottom: 2 },
  row: { display: "flex", gap: 12, alignItems: "flex-start" },
  formField: { marginBottom: 16 },
  divider: { borderTop: `1px solid ${C.border}`, margin: "20px 0" },
  fieldGroup: { marginBottom: 16 },
  sectionBar: { background: "rgba(79,142,247,.08)", border: `1px solid rgba(79,142,247,.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" },
  pill: (on) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, border: `1px solid ${on ? C.accent : C.border}`, background: on ? "rgba(79,142,247,.12)" : "transparent", color: on ? C.accent : C.textDim, cursor: "pointer", fontSize: 12, fontWeight: 500 }),
};

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={s.fieldGroup}>
    <label style={s.label}>{label}</label>
    {children}
  </div>
);
const Badge = ({ status }) => {
  const map = { live: "green", draft: "amber", withdrawn: "red", published: "green", pending: "amber", approved: "green", archived: "red" };
  return <span style={s.badge(map[status?.toLowerCase()] || "blue")}>{status}</span>;
};
const Tag = ({ text }) => <span style={s.tag}>{text}</span>;
const Divider = () => <div style={s.divider} />;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1 — Product Setup
// ─────────────────────────────────────────────────────────────────────────────
const INSURERS = ["Vhi Healthcare", "Irish Life Health", "Laya Healthcare", "Level Health"];
const FAMILIES = ["Entry", "Value", "Mid", "Premium", "Corporate", "Tailored"];
const TARGETS = ["Individual", "Family", "Child", "Corporate", "Senior", "Young Adult", "Expat"];
const CHANNELS = ["Direct", "Broker", "Corporate", "Digital", "Phone", "Partner"];
const STATUSES = ["Draft", "Pending Approval", "Published", "Archived", "Withdrawn"];
const CONSTRUCTS = ["Base Inpatient", "Outpatient", "Modular", "Packaged", "Employer-Sponsored"];

function ProductSetup() {
  const [form, setForm] = useState({
    name: "Health Secure Plus", code: "HSP-2026-04", marketId: "IE-HSP-2026-04-V1",
    insurer: "Irish Life Health", family: "Mid", description: "Mid-tier inpatient and outpatient plan with private hospital access, day-to-day cashback and digital GP support.",
    target: ["Individual", "Family"], construct: "Packaged", channel: ["Direct", "Digital"],
    status: "Draft", effectiveFrom: "2026-04-01", effectiveTo: "",
    renewalApplicability: "both", currency: "EUR", hiaFlag: true,
    policyDocUrl: "", tableOfCoverUrl: "", versionStatus: "Draft",
  });
  const [saved, setSaved] = useState(false);

  const toggle = (field, val) =>
    setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val] }));

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <div style={s.pageTitle}>Product Setup</div>
      <div style={s.pageDesc}>Define the core product master record — identity, targeting, regulatory status and document links.</div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>Identity</div>
          <Field label="Product Name">
            <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Product Code">
            <input style={s.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </Field>
          <Field label="Irish Market Identifier (UIN equivalent)">
            <input style={s.input} value={form.marketId} onChange={e => setForm(f => ({ ...f, marketId: e.target.value }))} />
          </Field>
          <Field label="Insurer">
            <select style={s.select} value={form.insurer} onChange={e => setForm(f => ({ ...f, insurer: e.target.value }))}>
              {INSURERS.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Product Family">
            <select style={s.select} value={form.family} onChange={e => setForm(f => ({ ...f, family: e.target.value }))}>
              {FAMILIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Product Construct">
            <select style={s.select} value={form.construct} onChange={e => setForm(f => ({ ...f, construct: e.target.value }))}>
              {CONSTRUCTS.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea style={s.textarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
        </div>

        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Targeting & Channels</div>
            <Field label="Product Target (multi-select)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TARGETS.map(t => (
                  <span key={t} style={s.pill(form.target.includes(t))} onClick={() => toggle("target", t)}>{t}</span>
                ))}
              </div>
            </Field>
            <Field label="Sales Channel (multi-select)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CHANNELS.map(t => (
                  <span key={t} style={s.pill(form.channel.includes(t))} onClick={() => toggle("channel", t)}>{t}</span>
                ))}
              </div>
            </Field>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Regulatory & Versioning</div>
            <div style={s.grid2}>
              <Field label="Regulatory Status">
                <select style={s.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(i => <option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Version Status">
                <select style={s.select} value={form.versionStatus} onChange={e => setForm(f => ({ ...f, versionStatus: e.target.value }))}>
                  {["Draft", "Pending Approval", "Published", "Archived"].map(i => <option key={i}>{i}</option>)}
                </select>
              </Field>
            </div>
            <div style={s.grid2}>
              <Field label="Effective From">
                <input type="date" style={s.input} value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
              </Field>
              <Field label="Effective To">
                <input type="date" style={s.input} value={form.effectiveTo} onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} />
              </Field>
            </div>
            <Field label="Renewal Applicability">
              <select style={s.select} value={form.renewalApplicability} onChange={e => setForm(f => ({ ...f, renewalApplicability: e.target.value }))}>
                <option value="new_business">New Business Only</option>
                <option value="renewal">Renewal Only</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <Field label="Currency">
              <input style={s.input} value={form.currency} disabled />
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <input type="checkbox" id="hiaFlag" checked={form.hiaFlag} onChange={e => setForm(f => ({ ...f, hiaFlag: e.target.checked }))} />
              <label htmlFor="hiaFlag" style={{ fontSize: 13, color: C.textDim }}>Surface in HIA comparison tool</label>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Document Links</div>
            <Field label="Policy Document URL">
              <input style={s.input} placeholder="https://.../policy-handbook.pdf" value={form.policyDocUrl} onChange={e => setForm(f => ({ ...f, policyDocUrl: e.target.value }))} />
            </Field>
            <Field label="Table of Cover URL">
              <input style={s.input} placeholder="https://.../table-of-cover.pdf" value={form.tableOfCoverUrl} onChange={e => setForm(f => ({ ...f, tableOfCoverUrl: e.target.value }))} />
            </Field>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={s.btn("primary")} onClick={handleSave}>{saved ? "Saved!" : "Save Product"}</button>
        <button style={s.btn("ghost")}>Reset</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Status:</span>
          <Badge status={form.status} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2 — Product Construct Builder
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_MODULES = [
  { id: "m1", name: "Base Inpatient Cover", mandatory: true, embedded: true, active: true, icon: "🏥" },
  { id: "m2", name: "Day-case Cover", mandatory: true, embedded: true, active: true, icon: "🩺" },
  { id: "m3", name: "Outpatient Cover", mandatory: false, embedded: true, active: true, icon: "💊" },
  { id: "m4", name: "Maternity Benefits", mandatory: false, embedded: false, active: false, icon: "🤱" },
  { id: "m5", name: "Fertility Support", mandatory: false, embedded: false, active: false, icon: "🔬" },
  { id: "m6", name: "Digital GP / Telemedicine", mandatory: false, embedded: true, active: true, icon: "💻" },
  { id: "m7", name: "Travel / Overseas Cover", mandatory: false, embedded: false, active: false, icon: "✈️" },
  { id: "m8", name: "Wellness / Gym Contribution", mandatory: false, embedded: false, active: true, icon: "🏋️" },
  { id: "m9", name: "Dental / Optical", mandatory: false, embedded: false, active: false, icon: "👁️" },
  { id: "m10", name: "Cancer Care Pathway", mandatory: false, embedded: true, active: true, icon: "🎗️" },
  { id: "m11", name: "Cardiac Support", mandatory: false, embedded: true, active: true, icon: "❤️" },
];

function ConstructBuilder() {
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [hospital, setHospital] = useState("PUBLIC_PRIVATE_SELECTED_HIGH_TECH");
  const [accommodation, setAccommodation] = useState("SEMI_PRIVATE");
  const [excess, setExcess] = useState("PER_ADMISSION_AND_OUTPATIENT_ANNUAL");

  const toggle = (id, field) =>
    setModules(ms => ms.map(m => m.id === id ? { ...m, [field]: !m[field] } : m));

  return (
    <div>
      <div style={s.pageTitle}>Product Construct Builder</div>
      <div style={s.pageDesc}>Toggle modules on/off, mark mandatory or embedded, and set the hospital network, accommodation entitlement and excess model.</div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>Benefit Modules</div>
          {modules.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18, width: 24 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: m.active ? C.text : C.muted }}>{m.name}</div>
              </div>
              <span style={s.pill(m.mandatory)} onClick={() => !m.mandatory && toggle(m.id, "mandatory")} title="Mandatory">
                {m.mandatory ? "Mandatory" : "Optional"}
              </span>
              <span style={s.pill(m.embedded)} onClick={() => toggle(m.id, "embedded")} title="Embedded">
                {m.embedded ? "Embedded" : "Add-on"}
              </span>
              <div
                onClick={() => toggle(m.id, "active")}
                style={{ width: 36, height: 20, borderRadius: 10, background: m.active ? C.accent : C.border, cursor: "pointer", position: "relative", transition: "background .2s" }}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: m.active ? 19 : 3, transition: "left .2s" }} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Hospital Network</div>
            {[
              { value: "PUBLIC_ONLY", label: "Public Hospitals Only" },
              { value: "PUBLIC_PRIVATE", label: "Public + Private Hospitals" },
              { value: "PUBLIC_PRIVATE_SELECTED_HIGH_TECH", label: "Public + Private + Selected High-Tech" },
              { value: "ALL_INCLUDING_HIGH_TECH", label: "All Including High-Tech Hospitals" },
            ].map(o => (
              <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
                <input type="radio" name="hospital" value={o.value} checked={hospital === o.value} onChange={() => setHospital(o.value)} />
                <span style={{ fontSize: 13 }}>{o.label}</span>
              </label>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Accommodation Entitlement</div>
            {[
              { value: "PUBLIC_WARD", label: "Public Ward" },
              { value: "SEMI_PRIVATE", label: "Semi-Private Room" },
              { value: "PRIVATE", label: "Private Room" },
              { value: "PRIVATE_HIGH_TECH", label: "Private Room (High-Tech)" },
            ].map(o => (
              <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
                <input type="radio" name="accommodation" value={o.value} checked={accommodation === o.value} onChange={() => setAccommodation(o.value)} />
                <span style={{ fontSize: 13 }}>{o.label}</span>
              </label>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Excess / Co-pay Model</div>
            {[
              { value: "NONE", label: "No Excess" },
              { value: "PER_ADMISSION", label: "Per Admission" },
              { value: "PER_NIGHT", label: "Per Night" },
              { value: "PER_ADMISSION_AND_OUTPATIENT_ANNUAL", label: "Per Admission + Annual Outpatient" },
              { value: "PER_YEAR", label: "Annual Excess" },
            ].map(o => (
              <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
                <input type="radio" name="excess" value={o.value} checked={excess === o.value} onChange={() => setExcess(o.value)} />
                <span style={{ fontSize: 13 }}>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={s.btn("primary")}>Save Construct</button>
        <button style={s.btn("ghost")}>Preview JSON</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3 — Benefit Tree Builder
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_BENEFITS = [
  {
    id: "b1", code: "BEN_INP_HOSP", name: "Inpatient Hospital Cover", category: "Inpatient", type: "Indemnity",
    level: 1, parentId: null, covered: true, limitType: "Full Cover", limitValue: "", claimBasis: "Per Admission",
    excessApplicable: true, excessType: "Per Admission", excessAmount: 150, copay: false, waitingPeriod: false,
    network: "Private Hospitals", displayText: "Full inpatient hospital cover in approved private hospitals.",
  },
  {
    id: "b2", code: "BEN_INP_ROOM_SEMI", name: "Semi-Private Room", category: "Inpatient", type: "Indemnity",
    level: 2, parentId: "b1", covered: true, limitType: "Full Cover", limitValue: "", claimBasis: "Per Night",
    excessApplicable: true, excessType: "Per Admission", excessAmount: 150, copay: false, waitingPeriod: false,
    network: "Approved Private Hospitals", displayText: "Semi-private room in approved private hospitals.",
  },
  {
    id: "b3", code: "BEN_INP_ROOM_PRIVATE", name: "Private Room", category: "Inpatient", type: "Indemnity",
    level: 2, parentId: "b1", covered: false, limitType: "Not Covered", limitValue: "", claimBasis: "Per Night",
    excessApplicable: true, excessType: "Per Admission", excessAmount: 150, copay: false, waitingPeriod: false,
    network: "High-Tech Hospitals Only", displayText: "Private room — upgrade available.",
  },
  {
    id: "b4", code: "BEN_OPD_GP", name: "GP Visit Cashback", category: "Outpatient", type: "Cash Benefit",
    level: 1, parentId: null, covered: true, limitType: "Fixed Amount", limitValue: "30", claimBasis: "Per Visit",
    excessApplicable: false, excessType: "", excessAmount: 0, copay: false, waitingPeriod: false,
    network: "Any GP", displayText: "€30 cashback per GP visit, up to 6 visits per year.",
  },
  {
    id: "b5", code: "BEN_OPD_CONSULTANT", name: "Consultant Outpatient Visit", category: "Outpatient", type: "Cash Benefit",
    level: 1, parentId: null, covered: true, limitType: "Fixed Amount", limitValue: "75", claimBasis: "Per Visit",
    excessApplicable: false, excessType: "", excessAmount: 0, copay: false, waitingPeriod: false,
    network: "Participating Consultants", displayText: "€75 cashback per consultant visit.",
  },
  {
    id: "b6", code: "BEN_OPD_MRI", name: "MRI / CT / PET-CT", category: "Outpatient", type: "Reimbursement",
    level: 1, parentId: null, covered: true, limitType: "Percentage", limitValue: "50", claimBasis: "Per Claim",
    excessApplicable: false, excessType: "", excessAmount: 0, copay: false, waitingPeriod: false,
    network: "Approved Centres", displayText: "50% of cost of MRI/CT/PET-CT at approved centres.",
  },
  {
    id: "b7", code: "BEN_MAT_DELIVERY", name: "Maternity — Consultant Delivery", category: "Maternity", type: "Indemnity",
    level: 1, parentId: null, covered: true, limitType: "Fixed Amount", limitValue: "3000", claimBasis: "Per Admission",
    excessApplicable: false, excessType: "", excessAmount: 0, copay: false, waitingPeriod: true,
    network: "Approved Maternity Hospitals", displayText: "Consultant delivery covered up to €3,000. 52-week waiting period applies.",
  },
  {
    id: "b8", code: "BEN_DIG_ONLINE_GP", name: "Online GP / Telemedicine", category: "Digital Health", type: "Service",
    level: 1, parentId: null, covered: true, limitType: "Unlimited", limitValue: "", claimBasis: "Per Use",
    excessApplicable: false, excessType: "", excessAmount: 0, copay: false, waitingPeriod: false,
    network: "Digital Platform", displayText: "Unlimited online GP consultations 24/7.",
  },
  {
    id: "b9", code: "BEN_WELL_GYM", name: "Wellness / Gym Contribution", category: "Wellness", type: "Cash Benefit",
    level: 1, parentId: null, covered: true, limitType: "Fixed Amount", limitValue: "200", claimBasis: "Per Policy Year",
    excessApplicable: false, excessType: "", excessAmount: 0, copay: false, waitingPeriod: false,
    network: "Any Provider", displayText: "€200 annual contribution to gym or wellness activities.",
  },
];

const CAT_COLORS = {
  Inpatient: "#4f8ef7", Outpatient: "#22c55e", Maternity: "#ec4899",
  "Digital Health": "#a78bfa", Wellness: "#f59e0b", Overseas: "#06b6d4",
};

function BenefitTree() {
  const [benefits, setBenefits] = useState(DEFAULT_BENEFITS);
  const [selected, setSelected] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newB, setNewB] = useState({ code: "", name: "", category: "Inpatient", type: "Indemnity", level: 1, limitType: "Full Cover", limitValue: "", claimBasis: "Per Admission", excessApplicable: false, excessType: "Per Admission", excessAmount: 0, displayText: "", waitingPeriod: false, network: "", copay: false });

  const cats = ["All", ...Array.from(new Set(benefits.map(b => b.category)))];
  const filtered = filterCat === "All" ? benefits : benefits.filter(b => b.category === filterCat);
  const sel = selected ? benefits.find(b => b.id === selected) : null;

  const updateSel = (field, val) =>
    setBenefits(bs => bs.map(b => b.id === selected ? { ...b, [field]: val } : b));

  const addBenefit = () => {
    const id = "b" + (benefits.length + 1);
    setBenefits(bs => [...bs, { ...newB, id, parentId: null, covered: true }]);
    setShowAdd(false);
    setNewB({ code: "", name: "", category: "Inpatient", type: "Indemnity", level: 1, limitType: "Full Cover", limitValue: "", claimBasis: "Per Admission", excessApplicable: false, excessType: "Per Admission", excessAmount: 0, displayText: "", waitingPeriod: false, network: "", copay: false });
  };

  return (
    <div>
      <div style={s.pageTitle}>Benefit Tree Builder</div>
      <div style={s.pageDesc}>Configure the 4-level benefit hierarchy — Category › Group › Item › Sublimit/Rule.</div>

      <div style={s.row}>
        {/* left list */}
        <div style={{ ...s.card, width: 340, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {cats.map(c => (
              <span key={c} style={{ ...s.pill(filterCat === c), fontSize: 11 }} onClick={() => setFilterCat(c)}>{c}</span>
            ))}
          </div>
          {filtered.map(b => (
            <div
              key={b.id}
              onClick={() => setSelected(b.id)}
              style={{ padding: "9px 10px", borderRadius: 6, marginBottom: 4, cursor: "pointer", background: selected === b.id ? "rgba(79,142,247,.1)" : "transparent", border: `1px solid ${selected === b.id ? C.accent : "transparent"}`, paddingLeft: 10 + (b.level - 1) * 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[b.category] || C.muted, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{b.name}</span>
                <span style={{ ...s.badge(b.covered ? "green" : "red"), fontSize: 10 }}>{b.covered ? "ON" : "OFF"}</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginLeft: 16 }}>{b.code}</div>
            </div>
          ))}
          <Divider />
          <button style={{ ...s.btn("primary"), width: "100%", marginTop: 4 }} onClick={() => setShowAdd(true)}>+ Add Benefit</button>
        </div>

        {/* right detail */}
        {sel ? (
          <div style={{ ...s.card, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: CAT_COLORS[sel.category] || C.muted }} />
              <div style={s.cardTitle}>{sel.name}</div>
              <div style={s.tag}>{sel.code}</div>
              <div style={{ marginLeft: "auto" }}>
                <div
                  onClick={() => updateSel("covered", !sel.covered)}
                  style={{ width: 40, height: 22, borderRadius: 11, background: sel.covered ? C.green : C.border, cursor: "pointer", position: "relative" }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sel.covered ? 21 : 3, transition: "left .2s" }} />
                </div>
              </div>
            </div>

            <div style={s.grid3}>
              <Field label="Category">
                <select style={s.select} value={sel.category} onChange={e => updateSel("category", e.target.value)}>
                  {["Inpatient", "Outpatient", "Maternity", "Digital Health", "Wellness", "Overseas"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Benefit Type">
                <select style={s.select} value={sel.type} onChange={e => updateSel("type", e.target.value)}>
                  {["Indemnity", "Cash Benefit", "Reimbursement", "Service", "Network Access"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Hierarchy Level">
                <select style={s.select} value={sel.level} onChange={e => updateSel("level", Number(e.target.value))}>
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>Level {n}</option>)}
                </select>
              </Field>
            </div>

            <div style={s.grid3}>
              <Field label="Claim Basis">
                <select style={s.select} value={sel.claimBasis} onChange={e => updateSel("claimBasis", e.target.value)}>
                  {["Per Visit", "Per Admission", "Per Night", "Per Claim", "Per Policy Year", "Per Use"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Limit Type">
                <select style={s.select} value={sel.limitType} onChange={e => updateSel("limitType", e.target.value)}>
                  {["Full Cover", "Fixed Amount", "Percentage", "Agreed Charge", "Unlimited", "Not Covered"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Limit Value">
                <input style={s.input} value={sel.limitValue} onChange={e => updateSel("limitValue", e.target.value)} placeholder="e.g. 100, 80%, Full" />
              </Field>
            </div>

            <Divider />
            <div style={s.grid3}>
              <div>
                <div style={s.label}>Excess Applicable</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" checked={sel.excessApplicable} onChange={e => updateSel("excessApplicable", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>{sel.excessApplicable ? "Yes" : "No"}</span>
                </label>
                {sel.excessApplicable && (
                  <>
                    <Field label="Excess Type">
                      <select style={s.select} value={sel.excessType} onChange={e => updateSel("excessType", e.target.value)}>
                        {["Per Claim", "Per Admission", "Per Night", "Per Year"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Excess Amount (€)">
                      <input style={s.input} type="number" value={sel.excessAmount} onChange={e => updateSel("excessAmount", Number(e.target.value))} />
                    </Field>
                  </>
                )}
              </div>
              <div>
                <div style={s.label}>Co-pay Applicable</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={sel.copay} onChange={e => updateSel("copay", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>{sel.copay ? "Yes" : "No"}</span>
                </label>
              </div>
              <div>
                <div style={s.label}>Waiting Period</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={sel.waitingPeriod} onChange={e => updateSel("waitingPeriod", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>{sel.waitingPeriod ? "Applies" : "Not Applicable"}</span>
                </label>
              </div>
            </div>

            <Field label="Network Dependency">
              <input style={s.input} value={sel.network} onChange={e => updateSel("network", e.target.value)} />
            </Field>
            <Field label="Customer Display Text">
              <textarea style={s.textarea} value={sel.displayText} onChange={e => updateSel("displayText", e.target.value)} />
            </Field>
          </div>
        ) : (
          <div style={{ ...s.card, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            Select a benefit to configure
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...s.card, width: 500, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={s.cardTitle}>Add New Benefit</div>
            <div style={s.grid2}>
              <Field label="Code"><input style={s.input} value={newB.code} onChange={e => setNewB(b => ({ ...b, code: e.target.value }))} /></Field>
              <Field label="Name"><input style={s.input} value={newB.name} onChange={e => setNewB(b => ({ ...b, name: e.target.value }))} /></Field>
            </div>
            <div style={s.grid2}>
              <Field label="Category">
                <select style={s.select} value={newB.category} onChange={e => setNewB(b => ({ ...b, category: e.target.value }))}>
                  {["Inpatient", "Outpatient", "Maternity", "Digital Health", "Wellness", "Overseas"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select style={s.select} value={newB.type} onChange={e => setNewB(b => ({ ...b, type: e.target.value }))}>
                  {["Indemnity", "Cash Benefit", "Reimbursement", "Service", "Network Access"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Display Text"><textarea style={s.textarea} value={newB.displayText} onChange={e => setNewB(b => ({ ...b, displayText: e.target.value }))} /></Field>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={s.btn("primary")} onClick={addBenefit}>Add</button>
              <button style={s.btn("ghost")} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 4 — Rider / Add-on Sequencing
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_RIDERS = [
  { id: "r1", seq: 1, name: "Base Premium", code: "BASE_PREMIUM", type: "Base", operation: "SET", factor: null, amount: 1200, mandatory: true, optional: false, affectsPremium: true, affectsBenefits: false },
  { id: "r2", seq: 2, name: "Day-to-Day Add-on", code: "DAY_TO_DAY_ADDON", type: "Additive", operation: "ADD_FIXED", factor: null, amount: 120, mandatory: false, optional: true, affectsPremium: true, affectsBenefits: true },
  { id: "r3", seq: 3, name: "High-Tech Hospital Upgrade", code: "HIGH_TECH_ACCESS", type: "Multiplicative", operation: "MULTIPLY", factor: 1.15, amount: null, mandatory: false, optional: true, affectsPremium: true, affectsBenefits: true },
  { id: "r4", seq: 4, name: "Excess-500 Discount", code: "EXCESS_500_DISCOUNT", type: "Multiplicative", operation: "MULTIPLY", factor: 0.92, amount: null, mandatory: false, optional: true, affectsPremium: true, affectsBenefits: false },
  { id: "r5", seq: 5, name: "Family Discount", code: "FAMILY_DISCOUNT", type: "Multiplicative", operation: "MULTIPLY", factor: 0.95, amount: null, mandatory: false, optional: true, affectsPremium: true, affectsBenefits: false },
  { id: "r6", seq: 6, name: "LCR Loading", code: "LCR_LOADING", type: "Additive", operation: "ADD_PERCENT_OF_GROSS", factor: null, amount: null, mandatory: true, optional: false, affectsPremium: true, affectsBenefits: false },
  { id: "r7", seq: 7, name: "Government Levy", code: "LEVY", type: "Additive", operation: "ADD_FIXED", factor: null, amount: 136, mandatory: true, optional: false, affectsPremium: true, affectsBenefits: false },
  { id: "r8", seq: 8, name: "Rounding", code: "ROUNDING", type: "System", operation: "ROUND", factor: null, amount: null, mandatory: true, optional: false, affectsPremium: true, affectsBenefits: false },
];

const OP_COLORS = { SET: "#6366f1", ADD_FIXED: "#22c55e", MULTIPLY: "#f59e0b", ADD_PERCENT_OF_GROSS: "#ef4444", ROUND: "#6b7280" };

function RiderSequencing() {
  const [riders, setRiders] = useState(DEFAULT_RIDERS);
  const [dragId, setDragId] = useState(null);
  const [editId, setEditId] = useState(null);

  const move = (id, dir) => {
    const idx = riders.findIndex(r => r.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === riders.length - 1)) return;
    const arr = [...riders];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    setRiders(arr.map((r, i) => ({ ...r, seq: i + 1 })));
  };

  const updateRider = (id, field, val) =>
    setRiders(rs => rs.map(r => r.id === id ? { ...r, [field]: val } : r));

  const ed = editId ? riders.find(r => r.id === editId) : null;

  return (
    <div>
      <div style={s.pageTitle}>Add-on & Rider Sequencing</div>
      <div style={s.pageDesc}>Drag or reorder riders to control the premium calculation pipeline. Sequence determines the order of additive and multiplicative operations.</div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>Pricing Pipeline</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Reorder using arrows. Click a row to edit.</div>
          {riders.map((r, idx) => (
            <div
              key={r.id}
              onClick={() => setEditId(r.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 4, background: editId === r.id ? "rgba(79,142,247,.1)" : C.surface, border: `1px solid ${editId === r.id ? C.accent : C.border}`, cursor: "pointer" }}
            >
              <span style={{ width: 24, height: 24, borderRadius: 6, background: OP_COLORS[r.operation] || C.muted, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.seq}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{r.operation}{r.factor ? ` × ${r.factor}` : r.amount != null ? ` €${r.amount}` : ""}</div>
              </div>
              <span style={s.badge(r.mandatory ? "blue" : "amber")}>{r.mandatory ? "Mandatory" : "Optional"}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button style={{ ...s.btn("ghost"), padding: "1px 6px", fontSize: 10 }} onClick={e => { e.stopPropagation(); move(r.id, -1); }}>▲</button>
                <button style={{ ...s.btn("ghost"), padding: "1px 6px", fontSize: 10 }} onClick={e => { e.stopPropagation(); move(r.id, 1); }}>▼</button>
              </div>
            </div>
          ))}
        </div>

        <div>
          {ed ? (
            <div style={s.card}>
              <div style={s.cardTitle}>Edit: {ed.name}</div>
              <Field label="Component Name">
                <input style={s.input} value={ed.name} onChange={e => updateRider(ed.id, "name", e.target.value)} />
              </Field>
              <Field label="Component Code">
                <input style={s.input} value={ed.code} onChange={e => updateRider(ed.id, "code", e.target.value)} />
              </Field>
              <Field label="Operation">
                <select style={s.select} value={ed.operation} onChange={e => updateRider(ed.id, "operation", e.target.value)}>
                  {["SET", "ADD_FIXED", "MULTIPLY", "ADD_PERCENT_OF_GROSS", "ROUND"].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              {(ed.operation === "MULTIPLY") && (
                <Field label="Factor">
                  <input style={s.input} type="number" step="0.01" value={ed.factor ?? ""} onChange={e => updateRider(ed.id, "factor", Number(e.target.value))} />
                </Field>
              )}
              {(ed.operation === "ADD_FIXED") && (
                <Field label="Amount (€)">
                  <input style={s.input} type="number" value={ed.amount ?? ""} onChange={e => updateRider(ed.id, "amount", Number(e.target.value))} />
                </Field>
              )}
              {(ed.operation === "SET") && (
                <Field label="Base Premium (€)">
                  <input style={s.input} type="number" value={ed.amount ?? ""} onChange={e => updateRider(ed.id, "amount", Number(e.target.value))} />
                </Field>
              )}
              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={ed.affectsPremium} onChange={e => updateRider(ed.id, "affectsPremium", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>Affects Premium</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={ed.affectsBenefits} onChange={e => updateRider(ed.id, "affectsBenefits", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>Affects Benefits</span>
                </label>
              </div>
            </div>
          ) : (
            <div style={{ ...s.card, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: C.muted }}>Click a row to edit</div>
          )}

          <div style={s.card}>
            <div style={s.cardTitle}>Operation Legend</div>
            {Object.entries(OP_COLORS).map(([op, color]) => (
              <div key={op} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim, width: 180 }}>{op}</span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  {op === "SET" ? "Sets base value" : op === "ADD_FIXED" ? "Adds fixed €amount" : op === "MULTIPLY" ? "Multiplies running total by factor" : op === "ADD_PERCENT_OF_GROSS" ? "Adds % of gross (e.g. LCR)" : "Rounds to nearest cent"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 5 — Discounts & Loadings
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_DISCOUNTS = [
  { id: "d1", name: "Child Under 18", type: "AGE_BASED", operation: "MULTIPLY", factor: 0.50, effectiveFrom: "2026-01-01", effectiveTo: "", stackable: true, priority: 20 },
  { id: "d2", name: "Family Discount", type: "FAMILY", operation: "MULTIPLY", factor: 0.95, effectiveFrom: "2026-01-01", effectiveTo: "", stackable: true, priority: 30 },
  { id: "d3", name: "Online Purchase Discount", type: "CHANNEL", operation: "MULTIPLY", factor: 0.97, effectiveFrom: "2026-01-01", effectiveTo: "", stackable: true, priority: 40 },
  { id: "d4", name: "Corporate Scheme Discount", type: "CORPORATE", operation: "MULTIPLY", factor: 0.90, effectiveFrom: "2026-01-01", effectiveTo: "", stackable: false, priority: 10 },
  { id: "d5", name: "Excess €500 Discount", type: "EXCESS_BASED", operation: "MULTIPLY", factor: 0.92, effectiveFrom: "2026-01-01", effectiveTo: "", stackable: true, priority: 50 },
];

const DEFAULT_LOADINGS = [
  { id: "l1", name: "Lifetime Community Rating (LCR)", type: "LCR", operation: "ADD_PERCENT_OF_GROSS", ratePerYear: 0.02, maxLoading: 0.70, maxDuration: 10, triggerAge: 35, breakWeeks: 13 },
  { id: "l2", name: "Upgrade Loading", type: "UPGRADE", operation: "ADD_PERCENT_OF_GROSS", ratePerYear: 0.00, maxLoading: 0.20, maxDuration: 2, triggerAge: 0, breakWeeks: 0 },
  { id: "l3", name: "Manual Underwriting Loading", type: "MANUAL", operation: "ADD_FIXED", ratePerYear: 0.00, maxLoading: 0.50, maxDuration: 5, triggerAge: 0, breakWeeks: 0 },
];

function DiscountsLoadings() {
  const [discounts, setDiscounts] = useState(DEFAULT_DISCOUNTS);
  const [loadings, setLoadings] = useState(DEFAULT_LOADINGS);
  const [tab, setTab] = useState("discounts");
  const [selDisc, setSelDisc] = useState(null);
  const [selLoad, setSelLoad] = useState("l1");

  const lcrRule = loadings.find(l => l.id === "l1");

  return (
    <div>
      <div style={s.pageTitle}>Discounts & Loadings</div>
      <div style={s.pageDesc}>Configure discount rules, stacking priorities, and statutory loadings including Lifetime Community Rating (LCR).</div>

      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {["discounts", "loadings", "lcr_calculator"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", background: "none", border: "none", cursor: "pointer", color: tab === t ? C.accent : C.muted, fontWeight: tab === t ? 700 : 400, fontSize: 13, borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent" }}>
            {t === "discounts" ? "Discount Rules" : t === "loadings" ? "Loading Rules" : "LCR Calculator"}
          </button>
        ))}
      </div>

      {tab === "discounts" && (
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardTitle}>Discount Rules</div>
            {discounts.map(d => (
              <div key={d.id} onClick={() => setSelDisc(d.id)} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", background: selDisc === d.id ? "rgba(79,142,247,.1)" : C.surface, border: `1px solid ${selDisc === d.id ? C.accent : C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</span>
                  <Tag text={d.type} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>×{d.factor}</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Priority {d.priority} · {d.stackable ? "Stackable" : "Non-stackable"} · From {d.effectiveFrom}</div>
              </div>
            ))}
            <button style={{ ...s.btn("primary"), width: "100%", marginTop: 8 }}>+ Add Discount Rule</button>
          </div>

          {selDisc ? (() => {
            const d = discounts.find(x => x.id === selDisc);
            const upd = (field, val) => setDiscounts(ds => ds.map(x => x.id === selDisc ? { ...x, [field]: val } : x));
            return (
              <div style={s.card}>
                <div style={s.cardTitle}>Edit: {d.name}</div>
                <Field label="Discount Name"><input style={s.input} value={d.name} onChange={e => upd("name", e.target.value)} /></Field>
                <div style={s.grid2}>
                  <Field label="Discount Type">
                    <select style={s.select} value={d.type} onChange={e => upd("type", e.target.value)}>
                      {["AGE_BASED", "FAMILY", "CHANNEL", "CORPORATE", "EXCESS_BASED", "PROMOTIONAL", "MULTI_POLICY", "RETENTION"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Operation">
                    <select style={s.select} value={d.operation} onChange={e => upd("operation", e.target.value)}>
                      <option>MULTIPLY</option><option>ADD_FIXED</option><option>ADD_PERCENT_OF_GROSS</option>
                    </select>
                  </Field>
                </div>
                <div style={s.grid2}>
                  <Field label="Factor / Value"><input style={s.input} type="number" step="0.01" value={d.factor} onChange={e => upd("factor", Number(e.target.value))} /></Field>
                  <Field label="Priority"><input style={s.input} type="number" value={d.priority} onChange={e => upd("priority", Number(e.target.value))} /></Field>
                </div>
                <div style={s.grid2}>
                  <Field label="Effective From"><input type="date" style={s.input} value={d.effectiveFrom} onChange={e => upd("effectiveFrom", e.target.value)} /></Field>
                  <Field label="Effective To"><input type="date" style={s.input} value={d.effectiveTo} onChange={e => upd("effectiveTo", e.target.value)} /></Field>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={d.stackable} onChange={e => upd("stackable", e.target.checked)} />
                  <span style={{ fontSize: 13 }}>Stackable with other discounts</span>
                </label>
              </div>
            );
          })() : <div style={{ ...s.card, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>Select a discount to edit</div>}
        </div>
      )}

      {tab === "loadings" && (
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardTitle}>Loading Rules</div>
            {loadings.map(l => (
              <div key={l.id} onClick={() => setSelLoad(l.id)} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", background: selLoad === l.id ? "rgba(239,68,68,.1)" : C.surface, border: `1px solid ${selLoad === l.id ? C.red : C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{l.name}</span>
                  <Tag text={l.type} />
                  {l.type === "LCR" && <span style={s.badge("red")}>Statutory</span>}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Operation: {l.operation} · Max: {(l.maxLoading * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
          {selLoad ? (() => {
            const l = loadings.find(x => x.id === selLoad);
            const upd = (field, val) => setLoadings(ls => ls.map(x => x.id === selLoad ? { ...x, [field]: val } : x));
            return (
              <div style={s.card}>
                <div style={s.cardTitle}>Edit: {l.name}</div>
                {l.type === "LCR" && (
                  <div style={{ ...s.sectionBar, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: C.accent }}>Statutory loading — Lifetime Community Rating (HIA regulated)</span>
                  </div>
                )}
                <div style={s.grid2}>
                  <Field label="Rate Per Year (%)"><input style={s.input} type="number" step="0.001" value={l.ratePerYear} onChange={e => upd("ratePerYear", Number(e.target.value))} /></Field>
                  <Field label="Max Loading (%)"><input style={s.input} type="number" step="0.01" value={l.maxLoading} onChange={e => upd("maxLoading", Number(e.target.value))} /></Field>
                </div>
                <div style={s.grid2}>
                  <Field label="Max Duration (years)"><input style={s.input} type="number" value={l.maxDuration} onChange={e => upd("maxDuration", Number(e.target.value))} /></Field>
                  <Field label="Trigger Age"><input style={s.input} type="number" value={l.triggerAge} onChange={e => upd("triggerAge", Number(e.target.value))} /></Field>
                </div>
                <Field label="Break-in-cover threshold (weeks)"><input style={s.input} type="number" value={l.breakWeeks} onChange={e => upd("breakWeeks", Number(e.target.value))} /></Field>
              </div>
            );
          })() : null}
        </div>
      )}

      {tab === "lcr_calculator" && <LCRCalculator />}
    </div>
  );
}

function LCRCalculator() {
  const [age, setAge] = useState(42);
  const [yearsCovered, setYearsCovered] = useState(0);
  const [basePremium, setBasePremium] = useState(1200);
  const [newResident, setNewResident] = useState(false);

  const yearsAbove34 = Math.max(0, age - 34);
  const yearsWithoutCover = Math.max(0, yearsAbove34 - yearsCovered);
  const rawRate = yearsWithoutCover * 0.02;
  const lcrRate = newResident ? 0 : Math.min(rawRate, 0.70);
  const lcrAmount = basePremium * lcrRate;
  const totalPremium = basePremium + lcrAmount;

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>LCR Loading Calculator</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Lifetime Community Rating applies 2% per year above age 34 without cover, max 70%, for up to 10 years.</div>
      <div style={s.grid3}>
        <Field label="Member Age">
          <input style={s.input} type="number" min={18} max={100} value={age} onChange={e => setAge(Number(e.target.value))} />
        </Field>
        <Field label="Years with Prior Cover">
          <input style={s.input} type="number" min={0} value={yearsCovered} onChange={e => setYearsCovered(Number(e.target.value))} />
        </Field>
        <Field label="Base Annual Premium (€)">
          <input style={s.input} type="number" value={basePremium} onChange={e => setBasePremium(Number(e.target.value))} />
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 20 }}>
        <input type="checkbox" checked={newResident} onChange={e => setNewResident(e.target.checked)} />
        <span style={{ fontSize: 13 }}>New Irish resident (within 9 months — LCR exempt)</span>
      </label>
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { label: "Years Above 34", val: yearsAbove34 },
          { label: "Years Without Cover", val: yearsWithoutCover },
          { label: "LCR Rate", val: (lcrRate * 100).toFixed(1) + "%" },
          { label: "LCR Amount", val: "€" + lcrAmount.toFixed(2) },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: C.surface, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(34,197,94,.07)", border: `1px solid rgba(34,197,94,.2)`, borderRadius: 8 }}>
        <span style={{ fontSize: 13, color: C.textDim }}>Total Annual Premium (incl. LCR): </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: C.green }}>€{totalPremium.toFixed(2)}</span>
        <span style={{ fontSize: 11, color: C.muted, marginLeft: 12 }}>Monthly: €{(totalPremium / 12).toFixed(2)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 6 — Price Revision Console
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_VERSIONS = [
  { id: "pv1", versionId: "PV-HSP-2025-01", product: "Health Secure Plus", version: "2025.01", effectiveFrom: "2025-01-01", effectiveTo: "2026-01-31", appliesTo: ["NEW_BUSINESS", "RENEWAL"], revisionType: "LAUNCH", changePercent: 0, status: "ARCHIVED", approvedBy: ["ACTUARIAL", "COMPLIANCE", "PRODUCT"] },
  { id: "pv2", versionId: "PV-HSP-2026-01", product: "Health Secure Plus", version: "2026.01", effectiveFrom: "2026-02-01", effectiveTo: null, appliesTo: ["NEW_BUSINESS", "RENEWAL"], revisionType: "PRICE_INCREASE", changePercent: 3.5, status: "PUBLISHED", approvedBy: ["ACTUARIAL", "COMPLIANCE", "PRODUCT"] },
  { id: "pv3", versionId: "PV-HSP-2026-02", product: "Health Secure Plus", version: "2026.02", effectiveFrom: "2026-06-01", effectiveTo: null, appliesTo: ["RENEWAL"], revisionType: "BENEFIT_AND_PRICE_CHANGE", changePercent: 2.1, status: "PENDING", approvedBy: ["ACTUARIAL"] },
];

const APPROVERS = ["ACTUARIAL", "COMPLIANCE", "PRODUCT", "LEGAL", "CEO"];

function PriceRevision() {
  const [versions, setVersions] = useState(DEFAULT_VERSIONS);
  const [sel, setSel] = useState("pv2");
  const [showNew, setShowNew] = useState(false);
  const [newVer, setNewVer] = useState({ versionId: "", effectiveFrom: "", revisionType: "PRICE_INCREASE", changePercent: 0, appliesTo: ["NEW_BUSINESS", "RENEWAL"], note: "" });

  const selected = versions.find(v => v.id === sel);
  const toggleApplies = (val) =>
    setNewVer(v => ({ ...v, appliesTo: v.appliesTo.includes(val) ? v.appliesTo.filter(x => x !== val) : [...v.appliesTo, val] }));

  const simulate = (v) => {
    const base = 1200;
    const old = base;
    const nw = base * (1 + v.changePercent / 100);
    return { old, nw, diff: nw - old };
  };

  const addVersion = () => {
    const id = "pv" + (versions.length + 1);
    setVersions(vs => [...vs, { ...newVer, id, product: "Health Secure Plus", version: `2026.0${versions.length}`, effectiveTo: null, status: "DRAFT", approvedBy: [] }]);
    setShowNew(false);
  };

  const STATUS_MAP = { PUBLISHED: "green", PENDING: "amber", DRAFT: "amber", ARCHIVED: "red" };

  return (
    <div>
      <div style={s.pageTitle}>Price Revision Console</div>
      <div style={s.pageDesc}>Version-controlled price and benefit change management. HIA requires monthly disclosure of pending changes; Central Bank mandates 5-year premium history at renewal.</div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <div style={s.cardTitle}>Price Versions</div>
            <button style={{ ...s.btn("primary"), marginLeft: "auto", fontSize: 12 }} onClick={() => setShowNew(true)}>+ New Version</button>
          </div>
          {versions.map(v => (
            <div key={v.id} onClick={() => setSel(v.id)} style={{ padding: "12px", borderRadius: 8, marginBottom: 8, cursor: "pointer", background: sel === v.id ? "rgba(79,142,247,.08)" : C.surface, border: `1px solid ${sel === v.id ? C.accent : C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{v.versionId}</span>
                <Badge status={v.status} />
                {v.changePercent !== 0 && <span style={{ fontSize: 12, color: v.changePercent > 0 ? C.red : C.green, fontWeight: 600 }}>{v.changePercent > 0 ? "+" : ""}{v.changePercent}%</span>}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                From {v.effectiveFrom} · {v.revisionType} · {v.appliesTo.join(", ")}
              </div>
            </div>
          ))}
        </div>

        {selected && (() => {
          const sim = simulate(selected);
          return (
            <div>
              <div style={s.card}>
                <div style={s.cardTitle}>Version Detail: {selected.versionId}</div>
                <div style={s.grid2}>
                  <div>
                    <div style={s.label}>Product</div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>{selected.product}</div>
                  </div>
                  <div>
                    <div style={s.label}>Version</div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>{selected.version}</div>
                  </div>
                </div>
                <div style={s.grid2}>
                  <div>
                    <div style={s.label}>Effective From</div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>{selected.effectiveFrom}</div>
                  </div>
                  <div>
                    <div style={s.label}>Effective To</div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>{selected.effectiveTo || "Open-ended"}</div>
                  </div>
                </div>
                <div>
                  <div style={s.label}>Applies To</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {selected.appliesTo.map(a => <Tag key={a} text={a} />)}
                  </div>
                </div>
                <div>
                  <div style={s.label}>Revision Type</div>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>{selected.revisionType}</div>
                </div>
                <div>
                  <div style={s.label}>Approval Status</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {APPROVERS.map(a => (
                      <span key={a} style={{ ...s.badge(selected.approvedBy.includes(a) ? "green" : "amber"), fontSize: 11 }}>
                        {selected.approvedBy.includes(a) ? "✓" : "○"} {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={s.card}>
                <div style={s.cardTitle}>Premium Impact Simulation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[
                    { label: "Current Annual Premium", val: `€${sim.old.toFixed(2)}`, color: C.textDim },
                    { label: "New Annual Premium", val: `€${sim.nw.toFixed(2)}`, color: selected.changePercent > 0 ? C.red : C.green },
                    { label: "Annual Difference", val: `${selected.changePercent >= 0 ? "+" : ""}€${sim.diff.toFixed(2)}`, color: selected.changePercent > 0 ? C.red : C.green },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: C.surface, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: C.muted }}>
                  Monthly change: {selected.changePercent >= 0 ? "+" : ""}€{(sim.diff / 12).toFixed(2)} · Renewal notice required 20+ working days before expiry · 5-year premium history required at renewal per Central Bank requirement
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...s.card, width: 500 }}>
            <div style={s.cardTitle}>New Price Version</div>
            <Field label="Version ID"><input style={s.input} value={newVer.versionId} onChange={e => setNewVer(v => ({ ...v, versionId: e.target.value }))} /></Field>
            <Field label="Effective From"><input type="date" style={s.input} value={newVer.effectiveFrom} onChange={e => setNewVer(v => ({ ...v, effectiveFrom: e.target.value }))} /></Field>
            <Field label="Revision Type">
              <select style={s.select} value={newVer.revisionType} onChange={e => setNewVer(v => ({ ...v, revisionType: e.target.value }))}>
                {["LAUNCH", "PRICE_INCREASE", "PRICE_DECREASE", "BENEFIT_CHANGE", "BENEFIT_AND_PRICE_CHANGE"].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Average Change %"><input style={s.input} type="number" step="0.1" value={newVer.changePercent} onChange={e => setNewVer(v => ({ ...v, changePercent: Number(e.target.value) }))} /></Field>
            <Field label="Applies To">
              <div style={{ display: "flex", gap: 8 }}>
                {["NEW_BUSINESS", "RENEWAL"].map(a => (
                  <span key={a} style={s.pill(newVer.appliesTo.includes(a))} onClick={() => toggleApplies(a)}>{a}</span>
                ))}
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={s.btn("primary")} onClick={addVersion}>Create Version</button>
              <button style={s.btn("ghost")} onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 7 — Waiting Periods
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_WP = [
  { id: "wp1", name: "New-to-Insurance Initial Period", conditionType: "INITIAL", duration: 26, unit: "WEEKS", triggerNewToInsurance: true, triggerBreakWeeks: 13, waiverSwitching: true, waiverSameOrLower: true, waiverAccident: true },
  { id: "wp2", name: "Pre-existing Condition", conditionType: "PRE_EXISTING_CONDITION", duration: 5, unit: "YEARS", triggerNewToInsurance: true, triggerBreakWeeks: 13, waiverSwitching: true, waiverSameOrLower: true, waiverAccident: false },
  { id: "wp3", name: "Maternity Waiting Period", conditionType: "MATERNITY", duration: 52, unit: "WEEKS", triggerNewToInsurance: true, triggerBreakWeeks: 13, waiverSwitching: true, waiverSameOrLower: false, waiverAccident: false },
  { id: "wp4", name: "Upgrade Waiting Period", conditionType: "UPGRADE", duration: 52, unit: "WEEKS", triggerNewToInsurance: false, triggerBreakWeeks: 0, waiverSwitching: false, waiverSameOrLower: false, waiverAccident: false },
];

function WaitingPeriods() {
  const [wps, setWps] = useState(DEFAULT_WP);
  const [sel, setSel] = useState("wp1");
  const selected = wps.find(w => w.id === sel);
  const upd = (field, val) => setWps(ws => ws.map(w => w.id === sel ? { ...w, [field]: val } : w));

  return (
    <div>
      <div style={s.pageTitle}>Waiting Period Configuration</div>
      <div style={s.pageDesc}>Configure waiting period rules including pre-existing conditions, maternity, upgrades, and break-in-cover triggers. Laya's 5-year pre-existing and 52-week maternity rules are shown as defaults.</div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>Waiting Period Rules</div>
          {wps.map(w => (
            <div key={w.id} onClick={() => setSel(w.id)} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", background: sel === w.id ? "rgba(79,142,247,.1)" : C.surface, border: `1px solid ${sel === w.id ? C.accent : C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{w.name}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {w.duration} {w.unit} · {w.conditionType}
              </div>
            </div>
          ))}
          <button style={{ ...s.btn("primary"), width: "100%", marginTop: 8 }}>+ Add Rule</button>
        </div>

        {selected && (
          <div style={s.card}>
            <div style={s.cardTitle}>{selected.name}</div>
            <div style={s.grid2}>
              <Field label="Condition Type">
                <select style={s.select} value={selected.conditionType} onChange={e => upd("conditionType", e.target.value)}>
                  {["INITIAL", "PRE_EXISTING_CONDITION", "MATERNITY", "UPGRADE", "BREAK_IN_COVER"].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Unit">
                <select style={s.select} value={selected.unit} onChange={e => upd("unit", e.target.value)}>
                  {["WEEKS", "MONTHS", "YEARS"].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Duration">
              <input style={s.input} type="number" value={selected.duration} onChange={e => upd("duration", Number(e.target.value))} />
            </Field>
            <Field label="Break-in-cover trigger (weeks)">
              <input style={s.input} type="number" value={selected.triggerBreakWeeks} onChange={e => upd("triggerBreakWeeks", Number(e.target.value))} />
            </Field>
            <Divider />
            <div style={s.label}>Waivers</div>
            {[
              { field: "triggerNewToInsurance", label: "Triggered for new-to-insurance" },
              { field: "waiverSwitching", label: "Waived when switching from another insurer" },
              { field: "waiverSameOrLower", label: "Waived for same or lower cover" },
              { field: "waiverAccident", label: "Waived for accidental injury" },
            ].map(({ field, label }) => (
              <label key={field} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={selected[field]} onChange={e => upd(field, e.target.checked)} />
                <span style={{ fontSize: 13 }}>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 8 — Premium Calculator (customer-facing simulation)
// ─────────────────────────────────────────────────────────────────────────────
function PremiumCalculator() {
  const [cfg, setCfg] = useState({
    plan: "Health Secure Plus", age: 35, yearsCovered: 1,
    dayToDay: true, highTech: false, excessLevel: "150",
    family: false, children: 0, newResident: false, channel: "Digital",
  });

  const BASE = 1200;
  let premium = BASE;
  const steps = [];

  steps.push({ step: 1, label: "Base Premium", op: "SET", value: BASE, running: BASE });
  if (cfg.dayToDay) { premium += 120; steps.push({ step: 2, label: "Day-to-Day Add-on", op: "+€120", value: 120, running: premium }); }
  if (cfg.highTech) { premium *= 1.15; steps.push({ step: 3, label: "High-Tech Hospital Upgrade", op: "×1.15", value: premium, running: premium }); }
  if (cfg.excessLevel === "500") { premium *= 0.92; steps.push({ step: 4, label: "Excess €500 Discount", op: "×0.92", value: premium, running: premium }); }
  if (cfg.excessLevel === "300") { premium *= 0.96; steps.push({ step: 4, label: "Excess €300 Discount", op: "×0.96", value: premium, running: premium }); }
  if (cfg.family) { premium *= 0.95; steps.push({ step: 5, label: "Family Discount", op: "×0.95", value: premium, running: premium }); }
  if (cfg.channel === "Digital") { premium *= 0.97; steps.push({ step: 5, label: "Online Purchase Discount", op: "×0.97", value: premium, running: premium }); }

  const yearsAbove34 = Math.max(0, cfg.age - 34);
  const yearsWithout = Math.max(0, yearsAbove34 - cfg.yearsCovered);
  const lcrRate = cfg.newResident ? 0 : Math.min(yearsWithout * 0.02, 0.70);
  const lcrAmt = premium * lcrRate;
  if (lcrAmt > 0) { premium += lcrAmt; steps.push({ step: 6, label: `LCR Loading (${(lcrRate * 100).toFixed(0)}%)`, op: `+€${lcrAmt.toFixed(2)}`, value: lcrAmt, running: premium }); }

  const levy = 136;
  premium += levy;
  steps.push({ step: 7, label: "Government Levy", op: `+€${levy}`, value: levy, running: premium });
  const childCost = cfg.children * (premium * 0.35);
  if (cfg.children > 0) { steps.push({ step: 8, label: `${cfg.children} child(ren) ×35%`, op: `+€${childCost.toFixed(2)}`, value: childCost, running: premium + childCost }); }
  const total = premium + childCost;

  return (
    <div>
      <div style={s.pageTitle}>Premium Calculator</div>
      <div style={s.pageDesc}>Simulate end-to-end premium calculation including LCR loading, riders, discounts and family pricing.</div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>Configuration</div>
          <div style={s.grid2}>
            <Field label="Member Age">
              <input style={s.input} type="number" min={18} max={99} value={cfg.age} onChange={e => setCfg(c => ({ ...c, age: Number(e.target.value) }))} />
            </Field>
            <Field label="Years with Prior Cover">
              <input style={s.input} type="number" min={0} value={cfg.yearsCovered} onChange={e => setCfg(c => ({ ...c, yearsCovered: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Excess Level">
            <select style={s.select} value={cfg.excessLevel} onChange={e => setCfg(c => ({ ...c, excessLevel: e.target.value }))}>
              <option value="150">€150 (Standard)</option>
              <option value="300">€300 (Discount applies)</option>
              <option value="500">€500 (Larger discount)</option>
            </select>
          </Field>
          <Field label="Sales Channel">
            <select style={s.select} value={cfg.channel} onChange={e => setCfg(c => ({ ...c, channel: e.target.value }))}>
              {["Direct", "Digital", "Broker", "Corporate"].map(ch => <option key={ch}>{ch}</option>)}
            </select>
          </Field>
          <Field label="Number of Children">
            <input style={s.input} type="number" min={0} max={10} value={cfg.children} onChange={e => setCfg(c => ({ ...c, children: Number(e.target.value) }))} />
          </Field>
          <Divider />
          {[
            { field: "dayToDay", label: "Include Day-to-Day Cover (+€120/yr)" },
            { field: "highTech", label: "High-Tech Hospital Upgrade (×1.15)" },
            { field: "family", label: "Family Policy (5% discount)" },
            { field: "newResident", label: "New Irish Resident (LCR exempt, <9 months)" },
          ].map(({ field, label }) => (
            <label key={field} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={cfg[field]} onChange={e => setCfg(c => ({ ...c, [field]: e.target.checked }))} />
              <span style={{ fontSize: 13 }}>{label}</span>
            </label>
          ))}
        </div>

        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Calculation Breakdown</div>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: C.tag, color: C.accent, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{step.step}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{step.label}</span>
                <span style={{ fontSize: 12, color: C.textDim, width: 70, textAlign: "right" }}>{step.op}</span>
                <span style={{ fontSize: 13, fontWeight: 600, width: 80, textAlign: "right" }}>€{step.running.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ ...s.card, background: "rgba(79,142,247,.06)", border: `1px solid ${C.accent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: C.muted }}>Total Annual Premium</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.accent }}>€{total.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: C.muted }}>Per Month</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>€{(total / 12).toFixed(2)}</div>
              </div>
            </div>
            {lcrRate > 0 && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(239,68,68,.08)", borderRadius: 6, fontSize: 12, color: C.textDim }}>
                LCR loading of {(lcrRate * 100).toFixed(0)}% applied — {Math.min(yearsWithout, 10)} year(s) without cover above age 34.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 9 — Audit Log
// ─────────────────────────────────────────────────────────────────────────────
const AUDIT_LOG = [
  { id: 1, entity: "Product", entityId: "HSP-2026-04", action: "CREATED", changedBy: "ambar.utkarsh@insurer.ie", changedAt: "2026-01-10 09:15", note: "Initial product shell created" },
  { id: 2, entity: "Benefit", entityId: "BEN_INP_ROOM_SEMI", action: "UPDATED", changedBy: "ambar.utkarsh@insurer.ie", changedAt: "2026-01-11 11:30", note: "Excess raised from €100 to €150" },
  { id: 3, entity: "PriceVersion", entityId: "PV-HSP-2026-01", action: "APPROVED", changedBy: "compliance@insurer.ie", changedAt: "2026-01-18 14:00", note: "Compliance sign-off for 2026.01 price file" },
  { id: 4, entity: "PriceVersion", entityId: "PV-HSP-2026-01", action: "PUBLISHED", changedBy: "product@insurer.ie", changedAt: "2026-01-20 08:00", note: "Published for new business and renewal" },
  { id: 5, entity: "Discount", entityId: "DISC_CHILD_U18", action: "CREATED", changedBy: "ambar.utkarsh@insurer.ie", changedAt: "2026-01-21 10:00", note: "Child under-18 50% discount added" },
  { id: 6, entity: "PriceVersion", entityId: "PV-HSP-2026-02", action: "CREATED", changedBy: "ambar.utkarsh@insurer.ie", changedAt: "2026-03-01 09:00", note: "Draft for April benefit and price revision" },
  { id: 7, entity: "PriceVersion", entityId: "PV-HSP-2026-02", action: "APPROVED", changedBy: "actuarial@insurer.ie", changedAt: "2026-03-05 16:00", note: "Actuarial approved +2.1% average change" },
];

const ACTION_COLOR = { CREATED: "green", UPDATED: "amber", APPROVED: "green", PUBLISHED: "green", WITHDRAWN: "red", CLONED: "blue" };

function AuditLog() {
  const [filter, setFilter] = useState("");
  const rows = AUDIT_LOG.filter(r =>
    !filter || r.entity.toLowerCase().includes(filter.toLowerCase()) || r.entityId.toLowerCase().includes(filter.toLowerCase()) || r.action.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div style={s.pageTitle}>Audit Log</div>
      <div style={s.pageDesc}>Immutable audit trail of all product configuration changes — who changed what, when and why.</div>
      <div style={s.card}>
        <div style={{ marginBottom: 16 }}>
          <input style={{ ...s.input, maxWidth: 320 }} placeholder="Filter by entity, ID or action..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              {["Entity", "Entity ID", "Action", "Changed By", "Changed At", "Note"].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={s.td}><Tag text={r.entity} /></td>
                <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12 }}>{r.entityId}</td>
                <td style={s.td}><Badge status={r.action} /></td>
                <td style={{ ...s.td, fontSize: 12, color: C.textDim }}>{r.changedBy}</td>
                <td style={{ ...s.td, fontSize: 12, color: C.muted }}>{r.changedAt}</td>
                <td style={{ ...s.td, fontSize: 12 }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 10 — Plan Compare (customer-facing)
// ─────────────────────────────────────────────────────────────────────────────
const COMPARE_PLANS = [
  {
    name: "Health Entry 150", family: "Entry", premium: 980, excess: 150, hospital: "Public + Private",
    room: "Semi-Private", gpCashback: 25, consultantCashback: 0, mri: false, maternity: false,
    digitalGp: true, wellness: 0, highTech: false,
  },
  {
    name: "Health Secure Plus", family: "Mid", premium: 1336, excess: 150, hospital: "Public + Private + Selected High-Tech",
    room: "Semi-Private", gpCashback: 30, consultantCashback: 75, mri: true, maternity: true,
    digitalGp: true, wellness: 200, highTech: true,
  },
  {
    name: "Health Premium Elite", family: "Premium", premium: 1890, excess: 0, hospital: "All Including High-Tech",
    room: "Private", gpCashback: 50, consultantCashback: 100, mri: true, maternity: true,
    digitalGp: true, wellness: 400, highTech: true,
  },
];

function PlanCompare() {
  const rows = [
    { label: "Annual Premium", key: "premium", format: v => `€${v}` },
    { label: "Excess Per Admission", key: "excess", format: v => v === 0 ? "None" : `€${v}` },
    { label: "Hospital Network", key: "hospital", format: v => v },
    { label: "Room Entitlement", key: "room", format: v => v },
    { label: "GP Cashback (per visit)", key: "gpCashback", format: v => `€${v}` },
    { label: "Consultant Cashback", key: "consultantCashback", format: v => v === 0 ? "Not Included" : `€${v}` },
    { label: "Scans (MRI/CT)", key: "mri", format: v => v ? "Included" : "Not Covered" },
    { label: "Maternity Cover", key: "maternity", format: v => v ? "Included" : "Not Covered" },
    { label: "Digital GP", key: "digitalGp", format: v => v ? "Unlimited" : "Not Included" },
    { label: "Wellness Contribution", key: "wellness", format: v => v === 0 ? "Not Included" : `€${v}/yr` },
    { label: "High-Tech Hospital", key: "highTech", format: v => v ? "Included" : "Not Included" },
  ];

  return (
    <div>
      <div style={s.pageTitle}>Plan Comparison</div>
      <div style={s.pageDesc}>Side-by-side comparison view powered by the product configurator. Central Bank expects clear comparison tools enabling consumers to review plan differences.</div>
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Benefit</th>
              {COMPARE_PLANS.map(p => (
                <th key={p.name} style={{ ...s.th, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{p.name}</div>
                  <Badge status={p.family} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td style={{ ...s.td, color: C.textDim, fontWeight: 500 }}>{row.label}</td>
                {COMPARE_PLANS.map(p => {
                  const val = p[row.key];
                  const isGood = row.key === "excess" ? val === 0 : typeof val === "boolean" ? val : typeof val === "number" ? val === Math.max(...COMPARE_PLANS.map(x => x[row.key])) : false;
                  return (
                    <td key={p.name} style={{ ...s.td, textAlign: "center", color: typeof val === "boolean" ? (val ? C.green : C.muted) : C.text }}>
                      {row.format(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "product", label: "Product Setup", icon: "📋" },
  { id: "construct", label: "Construct Builder", icon: "🧱" },
  { id: "benefits", label: "Benefit Tree", icon: "🌳" },
  { id: "riders", label: "Rider Sequencing", icon: "🔗" },
  { id: "discounts", label: "Discounts & Loadings", icon: "💰" },
  { id: "waiting", label: "Waiting Periods", icon: "⏳" },
  { id: "pricing", label: "Price Revision", icon: "📈" },
  { id: "calculator", label: "Premium Calculator", icon: "🧮" },
  { id: "compare", label: "Plan Compare", icon: "⚖️" },
  { id: "audit", label: "Audit Log", icon: "📜" },
];

export default function AmbarProdConfigurator() {
  const [active, setActive] = useState("product");

  const renderPage = () => {
    switch (active) {
      case "product": return <ProductSetup />;
      case "construct": return <ConstructBuilder />;
      case "benefits": return <BenefitTree />;
      case "riders": return <RiderSequencing />;
      case "discounts": return <DiscountsLoadings />;
      case "waiting": return <WaitingPeriods />;
      case "pricing": return <PriceRevision />;
      case "calculator": return <PremiumCalculator />;
      case "compare": return <PlanCompare />;
      case "audit": return <AuditLog />;
      default: return null;
    }
  };

  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoTitle}>Ambar Prod Configurator</div>
          <div style={s.logoSub}>Irish Health Insurance · v1.0</div>
        </div>
        {NAV.map(n => (
          <div key={n.id} style={s.navItem(active === n.id)} onClick={() => setActive(n.id)}>
            <span style={{ marginRight: 8 }}>{n.icon}</span>{n.label}
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "16px 20px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}` }}>
          HIA · Central Bank · LCR compliant<br />EUR · Ireland market
        </div>
      </div>
      <div style={s.main}>
        {renderPage()}
      </div>
    </div>
  );
}