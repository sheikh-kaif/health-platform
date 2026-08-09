import {
  downloadPrescriptionPdf,
  printPrescription,
  viewPrescription,
} from "../utils/prescription";
import { IconDownload, IconPrint, IconEye } from "./SidebarIcons";

export default function PrescriptionActions({
  record,
  meta,
  className = "",
  variant = "full",
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => viewPrescription(record, meta)}
        className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-100"
      >
        <IconEye width={14} height={14} />
        View
      </button>
      <button
        type="button"
        onClick={() => downloadPrescriptionPdf(record, meta)}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
      >
        <IconDownload width={14} height={14} />
        Download
      </button>
      {variant === "full" && (
        <button
          type="button"
          onClick={() => printPrescription(record, meta)}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-100"
        >
          <IconPrint width={14} height={14} />
          Print
        </button>
      )}
    </div>
  );
}
