import PilotShell from "../../components/layout/PilotShell";
import StaffSelfSummary from "../../components/profile/StaffSelfSummary";

export default function PilotReport() {
  return (
    <PilotShell>
      <div className="scr-title">My Report</div>
      <div className="scr-sub">Your attendance and salary</div>
      <StaffSelfSummary />
    </PilotShell>
  );
}
