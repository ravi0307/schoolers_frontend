import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as accountsApi from "../../api/accounts";
import * as attendanceApi from "../../api/attendance";
import * as marksApi from "../../api/marks";
import { Spinner, ErrorBanner, Pill } from "../../components/ui/Primitives";
import EmptyState from "../../components/ui/EmptyState";
import styles from "./ParentReport.module.css";

const amountFormat = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function monthLabel(value) {
  if (!value) return "—";
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function ReportTable({ headers, children }) {
  return (
    <DataTable label={`${headers.join(" ")} report table`}>
      <table className="data-table">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </DataTable>
  );
}

export default function ParentReport() {
  const { selectedChild } = useParentContext();
  const studentId = selectedChild?.student_id;
  const attendance = useApi(
    () => (studentId ? attendanceApi.getAttendance(studentId) : Promise.resolve([])),
    [studentId]
  );
  const marks = useApi(
    () => (studentId ? marksApi.studentMarks(studentId) : Promise.resolve([])),
    [studentId]
  );
  const fees = useApi(
    () => (studentId ? accountsApi.studentFeeHistory(studentId) : Promise.resolve([])),
    [studentId]
  );

  const presentCount = (attendance.data || []).filter((day) =>
    String(day.status || "").toLowerCase() === "present"
  ).length;
  const markedCount = attendance.data?.length || 0;
  const percentage = markedCount ? Math.round((presentCount / markedCount) * 100) : null;
  const feeRows = [...(fees.data || [])].sort((a, b) => String(b.month).localeCompare(String(a.month)));
  const markRows = [...(marks.data || [])].sort((a, b) =>
    String(b.term || "").localeCompare(String(a.term || ""))
  );
  const totalFees = feeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const errors = [attendance.error, marks.error, fees.error].filter(Boolean).join(" ");
  const loading = attendance.loading || marks.loading || fees.loading;

  return (
    <>
      <PageHeader
        title="My Report"
        subtitle={selectedChild ? `${selectedChild.name} · attendance, fees and marks` : ""}
      />
      {loading && <Spinner />}
      <ErrorBanner message={errors} />

      {!loading && !errors && selectedChild && (
        <div className={styles.reportGrid}>
          <Card as="section" className={`card white ${styles.reportCard}`}>
            <div className="section-label">Attendance</div>
            <div className="cta-row">
              <Pill>{presentCount} present</Pill>
              <Pill>{Math.max(markedCount - presentCount, 0)} absent</Pill>
              <Pill>{markedCount} days marked</Pill>
              <Pill>{percentage === null ? "—" : `${percentage}%`} present</Pill>
            </div>
            {!markedCount ? <EmptyState>No attendance records yet.</EmptyState> : (
              <ReportTable headers={["Date", "Status"]}>
                {[...(attendance.data || [])].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((day) => (
                  <tr key={day.attendance_id || day.date}>
                    <td>{dateLabel(day.date)}</td>
                    <td><Pill tone={day.status === "Present" ? "ok" : "warn"}>{day.status}</Pill></td>
                  </tr>
                ))}
              </ReportTable>
            )}
          </Card>
          <Card as="section" className={`card white ${styles.reportCard}`}>
            <div className="section-label">Fees deposited</div>
            <div className="cta-row">
              <Pill>{amountFormat.format(totalFees)} deposited</Pill>
              <Pill>{feeRows.length} months paid</Pill>
            </div>
            {!feeRows.length ? <EmptyState>No fee deposits recorded yet.</EmptyState> : (
              <ReportTable headers={["Month", "Amount", "Paid on", "Remark"]}>
                {feeRows.map((row) => (
                  <tr key={row.month}>
                    <td>{monthLabel(row.month)}</td>
                    <td>{amountFormat.format(Number(row.amount || 0))}</td>
                    <td>{dateLabel(row.paid_on)}</td>
                    <td>{row.note || "—"}</td>
                  </tr>
                ))}
              </ReportTable>
            )}
          </Card>
          <Card as="section" className={`card white ${styles.reportCard}`}>
            <div className="section-label">Marks</div>
            {!markRows.length ? <EmptyState>No marks recorded yet.</EmptyState> : (
              <ReportTable headers={["Subject", "Term", "Score"]}>
                {markRows.map((row) => (
                  <tr key={row.mark_id || `${row.subject_id}-${row.term}`}>
                    <td>{row.subject_name || `Subject #${row.subject_id}`}</td>
                    <td>{row.term || "—"}</td>
                    <td>{row.score}/100</td>
                  </tr>
                ))}
              </ReportTable>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
