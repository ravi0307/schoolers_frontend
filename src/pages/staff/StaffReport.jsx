import PageHeader from "../../components/ui/PageHeader";
import StaffSelfSummary from "../../components/profile/StaffSelfSummary";

export default function StaffReport() {
  return (
    <>
      <PageHeader title="My Report" subtitle="Your attendance and salary" />
      <StaffSelfSummary />
    </>
  );
}
