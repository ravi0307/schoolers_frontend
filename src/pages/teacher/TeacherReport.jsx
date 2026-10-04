import TeacherShell from "../../components/layout/TeacherShell";
import StaffSelfSummary from "../../components/profile/StaffSelfSummary";

export default function TeacherReport() {
  return (
    <TeacherShell>
      <div className="scr-title">My Report</div>
      <div className="scr-sub">Your attendance and salary</div>
      <StaffSelfSummary />
    </TeacherShell>
  );
}