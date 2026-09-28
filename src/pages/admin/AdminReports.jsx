import AdminShell from "../../components/layout/AdminShell";
import { Empty } from "../../components/ui/Primitives";

/*
 * Reporting is a placeholder on purpose. The nav group is named "Accounts and
 * Reporting" so the two belong together once the second half has content, but
 * inventing metrics nobody asked for would be worse than an honest gap: fee
 * collection rate, salary cost and month-over-month change are all guesses
 * about what this school actually tracks.
 */
export default function AdminReports() {
  return (
    <AdminShell>
      <div className="scr-title">Reporting</div>
      <div className="scr-sub">
        Financial and operational reports for this school.
      </div>

      <section className="card white">
        <Empty>
            Nothing to report yet. Reports will appear here once the measures
            your school tracks are added.
        </Empty>
      </section>
    </AdminShell>
  );
}
