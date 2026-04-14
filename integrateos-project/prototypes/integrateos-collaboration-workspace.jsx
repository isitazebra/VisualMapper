import { useState, useReducer, useCallback } from "react";

// ─── STATE ───
const initialState = {
  activePartner: "old-dominion",
  partners: {
    "old-dominion": {
      name: "Old Dominion Freight Line",
      scac: "ODFL",
      type: "LTL Carrier",
      status: "in-progress",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      protocol: "",
      endpoint: "",
      port: "",
      certType: "",
      certUploaded: false,
      sftpUser: "",
      sftpHost: "",
      sftpPath: "",
      ediVersion: "",
      testMode: true,
      notes: "",
      mappings: [],
      comments: [],
      lastActivity: null,
    },
    "echo-global": {
      name: "Echo Global Logistics",
      scac: "ECHO",
      type: "Freight Broker",
      status: "invited",
      contactName: "Maria Chen",
      contactEmail: "mchen@echo.com",
      contactPhone: "",
      protocol: "sftp",
      endpoint: "",
      port: "",
      certType: "",
      certUploaded: false,
      sftpUser: "",
      sftpHost: "",
      sftpPath: "",
      ediVersion: "",
      testMode: true,
      notes: "",
      mappings: [],
      comments: [],
      lastActivity: null,
    },
    "coyote-logistics": {
      name: "Coyote Logistics",
      scac: "CYOT",
      type: "Freight Broker",
      status: "not-started",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      protocol: "",
      endpoint: "",
      port: "",
      certType: "",
      certUploaded: false,
      sftpUser: "",
      sftpHost: "",
      sftpPath: "",
      ediVersion: "",
      testMode: true,
      notes: "",
      mappings: [],
      comments: [],
      lastActivity: null,
    },
  },
};

// Default mapping template for 204 load tender
const DEFAULT_MAPPINGS_204 = [
  { id: "m1", sourceField: "ISA*06", sourceLabel: "Sender ID", targetField: "", targetLabel: "Sender Qualifier", required: true, status: "pending", comment: "" },
  { id: "m2", sourceField: "ISA*08", sourceLabel: "Receiver ID", targetField: "", targetLabel: "Receiver Qualifier", required: true, status: "pending", comment: "" },
  { id: "m3", sourceField: "GS*02", sourceLabel: "App Sender Code", targetField: "", targetLabel: "Application Sender", required: true, status: "pending", comment: "" },
  { id: "m4", sourceField: "GS*03", sourceLabel: "App Receiver Code", targetField: "", targetLabel: "Application Receiver", required: true, status: "pending", comment: "" },
  { id: "m5", sourceField: "B2*04", sourceLabel: "Shipment ID", targetField: "", targetLabel: "Load Number", required: true, status: "pending", comment: "" },
  { id: "m6", sourceField: "B2*06", sourceLabel: "SCAC Code", targetField: "", targetLabel: "Carrier Code", required: true, status: "pending", comment: "" },
  { id: "m7", sourceField: "L11*BM", sourceLabel: "Bill of Lading", targetField: "", targetLabel: "BOL Number", required: true, status: "pending", comment: "" },
  { id: "m8", sourceField: "G62*64", sourceLabel: "Pickup Date", targetField: "", targetLabel: "Ship Date", required: true, status: "pending", comment: "" },
  { id: "m9", sourceField: "G62*10", sourceLabel: "Delivery Date", targetField: "", targetLabel: "Required Delivery", required: true, status: "pending", comment: "" },
  { id: "m10", sourceField: "N1*SH", sourceLabel: "Ship From Name", targetField: "", targetLabel: "Origin Name", required: true, status: "pending", comment: "" },
  { id: "m11", sourceField: "N3 (SH)", sourceLabel: "Ship From Address", targetField: "", targetLabel: "Origin Address", required: true, status: "pending", comment: "" },
  { id: "m12", sourceField: "N4 (SH)", sourceLabel: "Ship From City/St/Zip", targetField: "", targetLabel: "Origin CSZ", required: true, status: "pending", comment: "" },
  { id: "m13", sourceField: "N1*CN", sourceLabel: "Ship To Name", targetField: "", targetLabel: "Dest Name", required: true, status: "pending", comment: "" },
  { id: "m14", sourceField: "N3 (CN)", sourceLabel: "Ship To Address", targetField: "", targetLabel: "Dest Address", required: true, status: "pending", comment: "" },
  { id: "m15", sourceField: "N4 (CN)", sourceLabel: "Ship To City/St/Zip", targetField: "", targetLabel: "Dest CSZ", required: true, status: "pending", comment: "" },
  { id: "m16", sourceField: "AT8*G", sourceLabel: "Gross Weight (lbs)", targetField: "", targetLabel: "Weight", required: true, status: "pending", comment: "" },
  { id: "m17", sourceField: "S5*CL", sourceLabel: "Stop Sequence", targetField: "", targetLabel: "Stop Number", required: false, status: "pending", comment: "" },
  { id: "m18", sourceField: "L11*CR", sourceLabel: "Customer Reference", targetField: "", targetLabel: "PO Number", required: false, status: "pending", comment: "" },
  { id: "m19", sourceField: "N7*02", sourceLabel: "Equipment Type", targetField: "", targetLabel: "Trailer Type", required: false, status: "pending", comment: "" },
  { id: "m20", sourceField: "NTE*OTH", sourceLabel: "Special Instructions", targetField: "", targetLabel: "Notes/Comments", required: false, status: "pending", comment: "" },
];

function reducer(state, action) {
  switch (action.type) {
    case "SET_PARTNER":
      return { ...state, activePartner: action.id };
    case "UPDATE_FIELD": {
      const p = { ...state.partners[state.activePartner], [action.field]: action.value, lastActivity: new Date().toISOString() };
      return { ...state, partners: { ...state.partners, [state.activePartner]: p } };
    }
    case "INIT_MAPPINGS": {
      const p = { ...state.partners[state.activePartner], mappings: [...DEFAULT_MAPPINGS_204], lastActivity: new Date().toISOString() };
      return { ...state, partners: { ...state.partners, [state.activePartner]: p } };
    }
    case "UPDATE_MAPPING": {
      const p = { ...state.partners[state.activePartner] };
      p.mappings = p.mappings.map(m => m.id === action.id ? { ...m, ...action.updates } : m);
      p.lastActivity = new Date().toISOString();
      return { ...state, partners: { ...state.partners, [state.activePartner]: p } };
    }
    case "ADD_COMMENT": {
      const p = { ...state.partners[state.activePartner] };
      p.comments = [...p.comments, { id: Date.now(), author: action.author, text: action.text, section: action.section, fieldId: action.fieldId, time: new Date().toISOString() }];
      p.lastActivity = new Date().toISOString();
      return { ...state, partners: { ...state.partners, [state.activePartner]: p } };
    }
    case "SET_STATUS": {
      const p = { ...state.partners[state.activePartner], status: action.status, lastActivity: new Date().toISOString() };
      return { ...state, partners: { ...state.partners, [state.activePartner]: p } };
    }
    default: return state;
  }
}

// ─── DESIGN ───
const C = {
  bg: "#f7f8fa",
  white: "#ffffff",
  border: "#e2e5ea",
  borderFocus: "#3b82f6",
  text: "#1a1d23",
  textSec: "#5f6877",
  textDim: "#9ca3b0",
  accent: "#3b82f6",
  accentLight: "#eff4ff",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  greenBorder: "#bbf7d0",
  amber: "#d97706",
  amberLight: "#fffbeb",
  amberBorder: "#fde68a",
  red: "#dc2626",
  redLight: "#fef2f2",
  purple: "#7c3aed",
  purpleLight: "#f5f3ff",
  font: "'Instrument Sans', -apple-system, sans-serif",
  mono: "'DM Mono', 'Menlo', monospace",
};

const STATUS_MAP = {
  "not-started": { label: "Not Started", color: C.textDim, bg: C.bg },
  "invited": { label: "Invited", color: C.purple, bg: C.purpleLight },
  "in-progress": { label: "In Progress", color: C.accent, bg: C.accentLight },
  "review": { label: "Awaiting Review", color: C.amber, bg: C.amberLight },
  "complete": { label: "Complete", color: C.green, bg: C.greenLight },
};

// ─── SHARED COMPONENTS ───
function Input({ label, value, onChange, placeholder, type = "text", required, mono }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 5, fontFamily: C.font }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
        width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
        fontSize: 13, fontFamily: mono ? C.mono : C.font, color: C.text, background: C.white,
        outline: "none", transition: "border 0.2s", boxSizing: "border-box",
      }}
        onFocus={e => e.target.style.borderColor = C.borderFocus}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 5, fontFamily: C.font }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
        fontSize: 13, fontFamily: C.font, color: value ? C.text : C.textDim, background: C.white,
        outline: "none", cursor: "pointer", boxSizing: "border-box",
      }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Badge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP["not-started"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, fontFamily: C.font,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

function SectionCard({ title, subtitle, children, headerRight, accentColor }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10, border: `1px solid ${C.border}`,
      marginBottom: 16, overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {title && (
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderLeft: accentColor ? `3px solid ${accentColor}` : "none",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {headerRight}
        </div>
      )}
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

// ─── TAB: COMMUNICATION SETUP ───
function CommSetupTab({ state, dispatch }) {
  const p = state.partners[state.activePartner];
  const upd = (field) => (value) => dispatch({ type: "UPDATE_FIELD", field, value });

  const completionPct = [p.contactName, p.contactEmail, p.protocol, p.ediVersion]
    .filter(Boolean).length / 4 * 100;

  return (
    <div>
      {/* Completion bar */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" }}>Setup Progress</div>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.bg }}>
          <div style={{ height: "100%", borderRadius: 3, background: completionPct === 100 ? C.green : C.accent, width: `${completionPct}%`, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: C.mono, color: completionPct === 100 ? C.green : C.accent }}>{completionPct.toFixed(0)}%</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left column: Partner fills in */}
        <div>
          <SectionCard title="Partner Contact" subtitle="To be filled by partner" accentColor={C.purple}>
            <Input label="Primary Contact Name" value={p.contactName} onChange={upd("contactName")} placeholder="e.g. John Smith" required />
            <Input label="Email Address" value={p.contactEmail} onChange={upd("contactEmail")} placeholder="e.g. edi-support@odfl.com" type="email" required />
            <Input label="Phone" value={p.contactPhone} onChange={upd("contactPhone")} placeholder="e.g. +1 (336) 555-0100" />
          </SectionCard>

          <SectionCard title="Communication Protocol" subtitle="How will we exchange documents?" accentColor={C.accent}>
            <Select label="Protocol" value={p.protocol} onChange={upd("protocol")} required options={[
              { value: "as2", label: "AS2 (Recommended for high volume)" },
              { value: "sftp", label: "SFTP" },
              { value: "ftps", label: "FTPS" },
              { value: "https", label: "HTTPS / REST API" },
              { value: "van", label: "VAN (Value Added Network)" },
            ]} />

            {p.protocol === "as2" && (
              <>
                <Input label="AS2 Endpoint URL" value={p.endpoint} onChange={upd("endpoint")} placeholder="https://edi.odfl.com/as2" mono required />
                <Input label="Port" value={p.port} onChange={upd("port")} placeholder="443" mono />
                <Select label="Certificate Type" value={p.certType} onChange={upd("certType")} options={[
                  { value: "sha256", label: "SHA-256 (Recommended)" },
                  { value: "sha1", label: "SHA-1 (Legacy)" },
                ]} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 6, background: p.certUploaded ? C.greenLight : C.bg, border: `1px dashed ${p.certUploaded ? C.greenBorder : C.border}`, cursor: "pointer" }}
                  onClick={() => dispatch({ type: "UPDATE_FIELD", field: "certUploaded", value: !p.certUploaded })}>
                  <span style={{ fontSize: 18 }}>{p.certUploaded ? "✅" : "📎"}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: p.certUploaded ? C.green : C.text }}>
                      {p.certUploaded ? "Certificate uploaded" : "Upload public certificate (.cer, .pem)"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim }}>Click to {p.certUploaded ? "remove" : "simulate upload"}</div>
                  </div>
                </div>
              </>
            )}

            {p.protocol === "sftp" && (
              <>
                <Input label="SFTP Host" value={p.sftpHost} onChange={upd("sftpHost")} placeholder="sftp.odfl.com" mono required />
                <Input label="Username" value={p.sftpUser} onChange={upd("sftpUser")} placeholder="ait_edi_user" mono />
                <Input label="Remote Path" value={p.sftpPath} onChange={upd("sftpPath")} placeholder="/inbound/edi/" mono />
              </>
            )}

            {(p.protocol === "ftps" || p.protocol === "https") && (
              <>
                <Input label="Endpoint URL" value={p.endpoint} onChange={upd("endpoint")} placeholder={p.protocol === "ftps" ? "ftps://edi.odfl.com" : "https://api.odfl.com/edi/v1"} mono required />
                <Input label="Port" value={p.port} onChange={upd("port")} placeholder={p.protocol === "ftps" ? "990" : "443"} mono />
              </>
            )}

            {p.protocol === "van" && (
              <Input label="VAN Provider & Mailbox ID" value={p.endpoint} onChange={upd("endpoint")} placeholder="e.g. OpenText / ODFL001" />
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div>
          <SectionCard title="EDI Configuration" subtitle="Document standards and identifiers" accentColor={C.green}>
            <Select label="EDI Standard Version" value={p.ediVersion} onChange={upd("ediVersion")} required options={[
              { value: "4010", label: "X12 4010 (Most common)" },
              { value: "4030", label: "X12 4030" },
              { value: "5010", label: "X12 5010" },
              { value: "3040", label: "X12 3040 (Legacy)" },
            ]} />

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 8 }}>Transaction Sets Needed</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { code: "204", label: "Motor Carrier Load Tender" },
                  { code: "990", label: "Response to Load Tender" },
                  { code: "214", label: "Shipment Status (In-Transit)" },
                  { code: "210", label: "Freight Invoice" },
                  { code: "856", label: "Advance Ship Notice" },
                  { code: "997", label: "Functional Acknowledgment" },
                ].map(tx => {
                  const selected = (p.notes || "").includes(tx.code);
                  return (
                    <div key={tx.code} onClick={() => {
                      const current = p.notes || "";
                      upd("notes")(selected ? current.replace(tx.code + ",", "").replace(tx.code, "") : current + tx.code + ",");
                    }} style={{
                      padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${selected ? C.accent : C.border}`,
                      background: selected ? C.accentLight : C.white,
                      display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
                    }}>
                      <span style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${selected ? C.accent : C.border}`, background: selected ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selected && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="3"><path d="M3 8l3.5 3.5L13 5" /></svg>}
                      </span>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: C.mono, color: C.text }}>{tx.code}</span>
                        <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>{tx.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="AIT Configuration (Pre-filled)" subtitle="AIT's side — read-only for partner" accentColor="#e2e5ea">
            {[
              ["ISA Sender ID", "AITWORLDWIDE"],
              ["ISA Qualifier", "ZZ"],
              ["GS Application Code", "AIT"],
              ["AS2 Identifier", "AIT-EDI-PROD"],
              ["AIT AS2 Endpoint", "https://edi.aitworldwide.com/as2"],
              ["Test Endpoint", "https://edi-test.aitworldwide.com/as2"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.bg}` }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{k}</span>
                <span style={{ fontSize: 12, fontFamily: C.mono, color: C.text, fontWeight: 500, background: C.bg, padding: "1px 8px", borderRadius: 4 }}>{v}</span>
              </div>
            ))}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: FIELD MAPPING ───
function MappingTab({ state, dispatch }) {
  const p = state.partners[state.activePartner];
  const [commentField, setCommentField] = useState(null);
  const [commentText, setCommentText] = useState("");

  const hasMappings = p.mappings.length > 0;

  const mapped = p.mappings.filter(m => m.status === "mapped").length;
  const confirmed = p.mappings.filter(m => m.status === "confirmed").length;
  const total = p.mappings.length;

  const addComment = (fieldId) => {
    if (!commentText.trim()) return;
    dispatch({ type: "ADD_COMMENT", author: "AIT Team", text: commentText, section: "mapping", fieldId });
    setCommentText("");
    setCommentField(null);
  };

  return (
    <div>
      {!hasMappings ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>Start Field Mapping</div>
          <div style={{ fontSize: 13, color: C.textSec, maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Load the X12 204 mapping template to begin. Both AIT and the partner can fill in their field values and confirm each mapping.
          </div>
          <button onClick={() => dispatch({ type: "INIT_MAPPINGS" })} style={{
            padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
            background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: C.font,
          }}>Load 204 Load Tender Template</button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[
              { v: total, l: "Total Fields", c: C.textSec },
              { v: mapped, l: "Mapped", c: C.accent },
              { v: confirmed, l: "Confirmed", c: C.green },
              { v: total - mapped - confirmed, l: "Pending", c: C.amber },
            ].map(m => (
              <div key={m.l} style={{ flex: 1, background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: C.mono, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>{m.l}</div>
              </div>
            ))}
          </div>

          {/* Mapping table */}
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 20px 1fr 1fr 90px 60px", gap: 8, padding: "10px 16px", borderBottom: `2px solid ${C.border}`, alignItems: "center" }}>
              <div />
              <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: 1 }}>AIT Field (Source)</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: 1 }}>Description</div>
              <div />
              <div style={{ fontSize: 10, fontWeight: 800, color: C.purple, textTransform: "uppercase", letterSpacing: 1 }}>Partner Field</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.purple, textTransform: "uppercase", letterSpacing: 1 }}>Partner Description</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Status</div>
              <div />
            </div>

            {/* Rows */}
            {p.mappings.map((m, i) => {
              const fieldComments = p.comments.filter(c => c.fieldId === m.id);
              const isOpen = commentField === m.id;
              return (
                <div key={m.id}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "40px 1fr 1fr 20px 1fr 1fr 90px 60px",
                    gap: 8, padding: "8px 16px", alignItems: "center",
                    borderBottom: `1px solid ${C.bg}`,
                    background: m.status === "confirmed" ? C.greenLight : i % 2 === 0 ? C.white : C.bg + "88",
                  }}>
                    {/* Row number */}
                    <div style={{ fontSize: 10, fontFamily: C.mono, color: C.textDim, textAlign: "center" }}>{i + 1}</div>

                    {/* Source field (AIT side — fixed) */}
                    <div style={{ fontSize: 12, fontFamily: C.mono, color: C.text, fontWeight: 600 }}>{m.sourceField}</div>
                    <div style={{ fontSize: 12, color: C.textSec }}>{m.sourceLabel}</div>

                    {/* Arrow */}
                    <div style={{ textAlign: "center", color: m.status === "confirmed" ? C.green : C.textDim, fontSize: 14 }}>
                      {m.status === "confirmed" ? "✓" : "→"}
                    </div>

                    {/* Target field (Partner fills in) */}
                    <div>
                      <input
                        value={m.targetField}
                        onChange={e => dispatch({ type: "UPDATE_MAPPING", id: m.id, updates: { targetField: e.target.value, status: e.target.value ? "mapped" : "pending" } })}
                        placeholder="Partner field..."
                        style={{
                          width: "100%", padding: "5px 8px", borderRadius: 4, fontSize: 12, fontFamily: C.mono,
                          border: `1px solid ${m.status === "confirmed" ? C.greenBorder : C.border}`,
                          background: m.status === "confirmed" ? C.greenLight : C.white, color: C.text,
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <input
                        value={m.targetLabel}
                        onChange={e => dispatch({ type: "UPDATE_MAPPING", id: m.id, updates: { targetLabel: e.target.value } })}
                        placeholder="Description..."
                        style={{
                          width: "100%", padding: "5px 8px", borderRadius: 4, fontSize: 12,
                          border: `1px solid ${C.border}`, background: C.white, color: C.textSec,
                          outline: "none", fontFamily: C.font, boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* Status toggle */}
                    <div>
                      {m.targetField ? (
                        <button onClick={() => dispatch({ type: "UPDATE_MAPPING", id: m.id, updates: { status: m.status === "confirmed" ? "mapped" : "confirmed" } })} style={{
                          padding: "3px 10px", borderRadius: 20, border: `1px solid ${m.status === "confirmed" ? C.greenBorder : C.border}`,
                          background: m.status === "confirmed" ? C.greenLight : C.white, cursor: "pointer",
                          fontSize: 10, fontWeight: 600, color: m.status === "confirmed" ? C.green : C.accent, fontFamily: C.font,
                        }}>
                          {m.status === "confirmed" ? "✓ Confirmed" : "Confirm"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 10, color: C.textDim, fontStyle: "italic" }}>{m.required ? "Required" : "Optional"}</span>
                      )}
                    </div>

                    {/* Comment toggle */}
                    <div style={{ textAlign: "center" }}>
                      <button onClick={() => setCommentField(isOpen ? null : m.id)} style={{
                        width: 26, height: 26, borderRadius: "50%", border: `1px solid ${fieldComments.length > 0 ? C.accent : C.border}`,
                        background: fieldComments.length > 0 ? C.accentLight : "transparent", cursor: "pointer",
                        fontSize: 12, color: fieldComments.length > 0 ? C.accent : C.textDim, display: "flex", alignItems: "center", justifyContent: "center",
                        position: "relative",
                      }}>
                        💬
                        {fieldComments.length > 0 && (
                          <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: C.accent, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fieldComments.length}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inline comment thread */}
                  {isOpen && (
                    <div style={{ padding: "10px 16px 10px 56px", background: "#f0f4ff", borderBottom: `1px solid ${C.border}` }}>
                      {fieldComments.map(c => (
                        <div key={c.id} style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: c.author === "AIT Team" ? C.accent : C.purple, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {c.author === "AIT Team" ? "AIT" : "P"}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{c.author} <span style={{ fontWeight: 400, color: C.textDim }}>· just now</span></div>
                            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{c.text}</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <input value={commentText} onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addComment(m.id)}
                          placeholder="Add a comment about this field..."
                          style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: C.font, outline: "none", boxSizing: "border-box" }} />
                        <button onClick={() => addComment(m.id)} style={{
                          padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                          background: C.accent, color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: C.font,
                        }}>Send</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── TAB: ACTIVITY / CONVERSATION ───
function ActivityTab({ state, dispatch }) {
  const p = state.partners[state.activePartner];
  const [newMsg, setNewMsg] = useState("");
  const [msgAuthor, setMsgAuthor] = useState("AIT Team");

  const sendMsg = () => {
    if (!newMsg.trim()) return;
    dispatch({ type: "ADD_COMMENT", author: msgAuthor, text: newMsg, section: "general", fieldId: null });
    setNewMsg("");
  };

  const allComments = [...p.comments].reverse();
  const generalComments = allComments.filter(c => c.section === "general");
  const fieldComments = allComments.filter(c => c.section === "mapping");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      {/* Main conversation */}
      <SectionCard title="Conversation" subtitle="All communication in one place — no more email chains" accentColor={C.accent}>
        <div style={{ minHeight: 300, maxHeight: 400, overflowY: "auto", marginBottom: 14 }}>
          {generalComments.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 13 }}>
              No messages yet. Start the conversation below.
            </div>
          )}
          {generalComments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14, flexDirection: c.author === "AIT Team" ? "row" : "row-reverse" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: c.author === "AIT Team" ? C.accent : C.purple,
                color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              }}>{c.author === "AIT Team" ? "AIT" : p.scac.substring(0, 3)}</div>
              <div style={{
                maxWidth: "70%", padding: "10px 14px", borderRadius: 10,
                background: c.author === "AIT Team" ? C.accentLight : C.purpleLight,
                border: `1px solid ${c.author === "AIT Team" ? C.accent + "22" : C.purple + "22"}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 3 }}>{c.author}</div>
                <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Compose */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {["AIT Team", `${p.name.split(" ")[0]} Team`].map(a => (
              <button key={a} onClick={() => setMsgAuthor(a === `${p.name.split(" ")[0]} Team` ? "Partner" : a)} style={{
                padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.border}`, cursor: "pointer",
                background: (msgAuthor === a || (msgAuthor === "Partner" && a !== "AIT Team")) ? (a === "AIT Team" ? C.accentLight : C.purpleLight) : "transparent",
                fontSize: 11, fontWeight: 600, fontFamily: C.font,
                color: (msgAuthor === a || (msgAuthor === "Partner" && a !== "AIT Team")) ? (a === "AIT Team" ? C.accent : C.purple) : C.textDim,
              }}>{a === "AIT Team" ? "Send as AIT" : `Send as ${p.name.split(" ")[0]}`}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()}
              placeholder="Type a message..." style={{
                flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
                fontSize: 13, fontFamily: C.font, outline: "none", boxSizing: "border-box",
              }} />
            <button onClick={sendMsg} style={{
              padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: C.font,
            }}>Send</button>
          </div>
        </div>
      </SectionCard>

      {/* Sidebar: field-level comments */}
      <div>
        <SectionCard title="Field Discussions" subtitle="Comments on specific mapping fields" accentColor={C.amber}>
          {fieldComments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontSize: 12 }}>
              No field comments yet. Use 💬 in the Mapping tab to discuss specific fields.
            </div>
          ) : (
            fieldComments.map(c => {
              const field = p.mappings.find(m => m.id === c.fieldId);
              return (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.bg}` }}>
                  <div style={{ fontSize: 10, fontFamily: C.mono, color: C.accent, marginBottom: 3 }}>
                    {field?.sourceField} → {field?.targetField || "unmapped"}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSec }}><strong>{c.author}:</strong> {c.text}</div>
                </div>
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Onboarding Checklist" accentColor={C.green}>
          {[
            { label: "Partner contact info submitted", done: !!(p.contactName && p.contactEmail) },
            { label: "Communication protocol selected", done: !!p.protocol },
            { label: "EDI version confirmed", done: !!p.ediVersion },
            { label: "Certificates exchanged", done: p.certUploaded },
            { label: "All required fields mapped", done: p.mappings.filter(m => m.required).every(m => m.status === "confirmed") },
            { label: "Test transactions sent", done: false },
            { label: "Go-live approved", done: false },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4, border: `2px solid ${item.done ? C.green : C.border}`,
                background: item.done ? C.greenLight : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {item.done && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={C.green} strokeWidth="3"><path d="M3 8l3.5 3.5L13 5" /></svg>}
              </span>
              <span style={{ fontSize: 12, color: item.done ? C.green : C.textSec, textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tab, setTab] = useState("comm");

  const p = state.partners[state.activePartner];
  const partnerList = Object.entries(state.partners);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: C.font, color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } input::placeholder, textarea::placeholder { color: ${C.textDim}; }`}</style>

      {/* Left panel: partner list */}
      <div style={{ width: 260, background: C.white, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: C.accent, transform: "rotate(45deg)" }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>IntegrateOS</span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>AIT Worldwide · Partner Workspace</div>
        </div>

        <div style={{ padding: "12px 10px 6px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
          Partners ({partnerList.length})
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {partnerList.map(([id, partner]) => (
            <div key={id} onClick={() => dispatch({ type: "SET_PARTNER", id })} style={{
              padding: "12px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
              background: state.activePartner === id ? C.accentLight : "transparent",
              border: `1px solid ${state.activePartner === id ? C.accent + "33" : "transparent"}`,
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{partner.name}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textDim }}>{partner.scac} · {partner.type}</span>
                <Badge status={partner.status} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
          <button style={{
            width: "100%", padding: "9px", borderRadius: 6, border: `1px dashed ${C.border}`,
            background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.textSec, fontFamily: C.font,
          }}>+ Add Partner</button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{p.name}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
              {p.scac} · {p.type} · <Badge status={p.status} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => dispatch({ type: "SET_STATUS", status: "review" })} style={{
              padding: "7px 16px", borderRadius: 6, border: `1px solid ${C.border}`,
              background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.textSec, fontFamily: C.font,
            }}>Submit for Review</button>
            <button onClick={() => dispatch({ type: "SET_STATUS", status: "complete" })} style={{
              padding: "7px 16px", borderRadius: 6, border: "none",
              background: C.green, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: C.font,
            }}>Mark Complete ✓</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", gap: 0 }}>
          {[
            { key: "comm", label: "Communication Setup", icon: "🔗" },
            { key: "mapping", label: "Field Mapping", icon: "🗺️" },
            { key: "activity", label: "Activity & Chat", icon: "💬" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "12px 18px", border: "none", cursor: "pointer",
              background: "transparent", fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? C.accent : C.textSec,
              borderBottom: tab === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
              fontFamily: C.font, transition: "all 0.2s",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {tab === "comm" && <CommSetupTab state={state} dispatch={dispatch} />}
          {tab === "mapping" && <MappingTab state={state} dispatch={dispatch} />}
          {tab === "activity" && <ActivityTab state={state} dispatch={dispatch} />}
        </div>
      </div>
    </div>
  );
}
