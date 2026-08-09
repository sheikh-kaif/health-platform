import { jsPDF } from "jspdf";

function buildLines(record, { patientName, doctorName } = {}) {
  const lines = [];
  lines.push(["title", "Prescription"]);
  lines.push([
    "meta",
    `Date: ${new Date(record.visitDate).toLocaleDateString()}`,
  ]);
  if (patientName) lines.push(["meta", `Patient: ${patientName}`]);
  if (doctorName) lines.push(["meta", `Doctor: Dr. ${doctorName}`]);
  lines.push(["heading", "Diagnosis"]);
  lines.push(["body", record.diagnosis || "—"]);
  if (record.symptoms?.length) {
    lines.push(["heading", "Symptoms"]);
    lines.push(["body", record.symptoms.join(", ")]);
  }
  if (record.medicines?.length) {
    lines.push(["heading", "Medicines"]);
    record.medicines.forEach((m) => {
      lines.push([
        "body",
        `• ${m.name}${m.dosage ? ` — ${m.dosage}` : ""}${m.frequency ? ` · ${m.frequency}` : ""}`,
      ]);
    });
  }
  if (record.notes) {
    lines.push(["heading", "Notes"]);
    lines.push(["body", record.notes]);
  }
  return lines;
}

export function downloadPrescriptionPdf(record, meta = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 64;

  buildLines(record, meta).forEach(([kind, text]) => {
    if (kind === "title") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(text, marginX, y);
      y += 26;
      doc.setDrawColor(37, 99, 235);
      doc.line(marginX, y - 14, 547, y - 14);
    } else if (kind === "meta") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(text, marginX, y);
      y += 16;
    } else if (kind === "heading") {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(text, marginX, y);
      y += 16;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const wrapped = doc.splitTextToSize(text, 500);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 14 + 4;
    }
  });

  const filename = `prescription-${new Date(record.visitDate).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function buildHtml(record, meta) {
  const lines = buildLines(record, meta);
  return `
    <html>
      <head>
        <title>Prescription</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          .meta { color: #64748b; font-size: 13px; margin: 2px 0; }
          h2 { font-size: 14px; margin-top: 20px; margin-bottom: 6px; }
          p, li { font-size: 14px; line-height: 1.5; }
        </style>
      </head>
      <body>
        ${lines
          .map(([kind, text]) => {
            if (kind === "title") return `<h1>${text}</h1>`;
            if (kind === "meta") return `<p class="meta">${text}</p>`;
            if (kind === "heading") return `<h2>${text}</h2>`;
            return `<p>${text}</p>`;
          })
          .join("\n")}
      </body>
    </html>
  `;
}

export function printPrescription(record, meta = {}) {
  const win = window.open("", "_blank", "width=650,height=800");
  if (!win) return;
  win.document.write(buildHtml(record, meta));
  win.document.close();
  win.focus();

  setTimeout(() => win.print(), 300);
}

export function viewPrescription(record, meta = {}) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildHtml(record, meta));
  win.document.close();
  win.focus();
}
