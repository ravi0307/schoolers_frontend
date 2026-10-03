import StaffShell from "../../components/layout/StaffShell";
import StaffSelfSummary from "../../components/profile/StaffSelfSummary";

export default function StaffReport() {
  return (
    <StaffShell>
      <div className="scr-title">My Report</div>
      <div className="scr-sub">Your attendance and salary</div>
      <StaffSelfSummary />
    </StaffShell>
  );
}
