import StaffSelfSummary from "../../components/profile/StaffSelfSummary";

export default function StaffReport() {
  return (
    <>
      <div className="scr-title-row">
        <div className="scr-title-text">
          <div className="scr-title">My Report</div>
          <div className="scr-sub">Your attendance and salary</div>
        </div>
      </div>
      <StaffSelfSummary />
    </>
  );
}
