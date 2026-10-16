import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import * as academicsApi from "../../api/academics";
import * as schoolsApi from "../../api/schools";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, ConfirmDialog, Pill } from "../../components/ui/Primitives";
import PageHeader from "../../components/ui/PageHeader";
import { apiErrorMessage } from "../../api/client";

/**
 * Examination settings: the school's marking system, examination types,
 * and grade scales. Grade scales version on change so published results
 * always render under the rules they were published with.
 */

export default function AdminExamSettings() {
  const { user } = useAuth();
  const school = useApi(() => (user?.schoolId ? schoolsApi.getSchool(user.schoolId) : Promise.resolve(null)), [user?.schoolId]);
  const types = useApi(() => academicsApi.listExaminationTypes(), []);
  const scales = useApi(() => academicsApi.listGradeScales(), []);
  const [typeDraft, setTypeDraft] = useState({ name: "", description: "", default_max_marks: 100 });
  const [scaleDraft, setScaleDraft] = useState({ name: "" });
  const [levelDraft, setLevelDraft] = useState({});
  const [openScale, setOpenScale] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(null);
  const toast = useToast();

  const levels = useApi(
    () => (openScale ? academicsApi.listGradeLevels(openScale) : Promise.resolve([])),
    [openScale]
  );

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      toast(message);
      school.refetch();
      types.refetch();
      scales.refetch();
      levels.refetch();
      return true;
    } catch (err) {
      toast(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const marking = school.data?.marking_system || "marks";
  const openScaleRow = (scales.data || []).find((s) => s.scale_id === Number(openScale));

  return (
    <AdminShell>
      <PageHeader title="Examination Settings" subtitle="Marking system, types, and grade scales" />
      {school.loading && <Spinner />}
      <ErrorBanner message={school.error || types.error || scales.error} />
      {!school.loading && !school.error && (
        <>
          <div className="card">
            <div className="section-label">Marking system</div>
            <div className="meta">
              <span>Current: <b>{marking === "marks" ? "Marks / numbers" : "Grades"}</b></span>
              <Pill tone={marking === "marks" ? "mute" : "info"}>
                {marking === "marks" ? "Teachers enter scores against maximum marks" : "Teachers assign grades from the school scale"}
              </Pill>
            </div>
            <div className="meta">
              <button
                className="btn sm"
                disabled={busy || marking === "marks"}
                onClick={() => setConfirmSwitch("marks")}
              >
                Use marks
              </button>
              <button
                className="btn sm"
                disabled={busy || marking === "grades"}
                onClick={() => setConfirmSwitch("grades")}
              >
                Use grades
              </button>
            </div>
            <div className="meta"><span>Switching affects new examinations only. Published results keep their original format.</span></div>
          </div>

          <div className="card">
            <div className="section-label">Examination types</div>
            {!(types.data || []).length && <Empty>No examination types yet. Add Unit Test, Half-Yearly, Annual, and the rest.</Empty>}
            {(types.data || []).map((t) => (
              <div key={t.type_id} className="listitem">
                <div className="meta">
                  <b>{t.name}</b>
                  <span>max {t.default_max_marks}{t.description ? ` · ${t.description}` : ""}{!t.is_active ? " · inactive" : ""}</span>
                </div>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() => run(
                    () => academicsApi.updateExaminationType(t.type_id, { is_active: !t.is_active }),
                    t.is_active ? "Type deactivated" : "Type activated"
                  )}
                >
                  {t.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
            <form
              className="grid2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!typeDraft.name.trim()) {
                  toast("Name the examination type");
                  return;
                }
                run(
                  () => academicsApi.createExaminationType({
                    name: typeDraft.name.trim(),
                    description: typeDraft.description.trim() || undefined,
                    default_max_marks: Number(typeDraft.default_max_marks) || 100,
                  }).then(() => setTypeDraft({ name: "", description: "", default_max_marks: 100 })),
                  "Examination type created"
                );
              }}
            >
              <div className="field">
                <label>Name</label>
                <input value={typeDraft.name} onChange={(e) => setTypeDraft({ ...typeDraft, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Default max marks</label>
                <input type="number" min="1" value={typeDraft.default_max_marks} onChange={(e) => setTypeDraft({ ...typeDraft, default_max_marks: e.target.value })} />
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <input value={typeDraft.description} onChange={(e) => setTypeDraft({ ...typeDraft, description: e.target.value })} />
              </div>
              <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Add type</button></div>
            </form>
          </div>

          <div className="card">
            <div className="section-label">Grade scales</div>
            {!(scales.data || []).length && <Empty>No grade scales yet. Create one before switching to grades.</Empty>}
            {(scales.data || []).map((s) => (
              <div key={s.scale_id} className="listitem">
                <div className="meta">
                  <b>{s.name} · v{s.version}</b>
                  <span>{!s.is_active ? "inactive" : "active"}</span>
                </div>
                <button className="btn sm" onClick={() => { setOpenScale(openScale === s.scale_id ? null : s.scale_id); }}>
                  {openScale === s.scale_id ? "Close" : "Levels"}
                </button>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() => run(
                    () => academicsApi.newGradeScaleVersion(s.scale_id),
                    "New scale version opened; the old version stays frozen for history"
                  )}
                >
                  New version
                </button>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={() => run(
                    () => academicsApi.updateGradeScale(s.scale_id, { is_active: !s.is_active }),
                    s.is_active ? "Scale deactivated" : "Scale activated"
                  )}
                >
                  {s.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!scaleDraft.name.trim()) {
                  toast("Name the grade scale");
                  return;
                }
                run(
                  () => academicsApi.createGradeScale({ name: scaleDraft.name.trim() })
                    .then(() => setScaleDraft({ name: "" })),
                  "Grade scale created — add its levels below"
                );
              }}
            >
              <div className="field">
                <label>New scale name</label>
                <input value={scaleDraft.name} onChange={(e) => setScaleDraft({ name: e.target.value })} />
              </div>
              <button className="btn primary" disabled={busy}>Add scale</button>
            </form>
          </div>

          {openScaleRow && (
            <div className="card">
              <div className="section-label">Levels in {openScaleRow.name} v{openScaleRow.version}</div>
              {levels.loading && <Spinner />}
              <ErrorBanner message={levels.error} />
              {!(levels.data || []).length && !levels.loading && <Empty>No levels yet.</Empty>}
              {(levels.data || []).map((l) => (
                <div key={l.level_id} className="listitem">
                  <div className="meta">
                    <b>{l.label}</b>
                    <span>
                      rank {l.rank}
                      {l.min_score != null && l.max_score != null ? ` · ${l.min_score}–${l.max_score}` : " · direct grade"}
                      {l.description ? ` · ${l.description}` : ""}
                    </span>
                  </div>
                </div>
              ))}
              <form
                className="grid2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = levelDraft[openScale] || {};
                  if (!d.label?.trim()) {
                    toast("Give the grade a label");
                    return;
                  }
                  run(
                    () => academicsApi.createGradeLevel(openScale, {
                      label: d.label.trim(),
                      rank: Number(d.rank) || 0,
                      min_score: d.min_score === "" || d.min_score == null ? null : Number(d.min_score),
                      max_score: d.max_score === "" || d.max_score == null ? null : Number(d.max_score),
                      description: d.description?.trim() || null,
                    }).then(() => setLevelDraft({ ...levelDraft, [openScale]: {} })),
                    "Grade added"
                  );
                }}
              >
                <div className="field">
                  <label>Label (e.g. A+)</label>
                  <input value={levelDraft[openScale]?.label || ""} onChange={(e) => setLevelDraft({ ...levelDraft, [openScale]: { ...levelDraft[openScale], label: e.target.value } })} />
                </div>
                <div className="field">
                  <label>Rank</label>
                  <input type="number" value={levelDraft[openScale]?.rank ?? ""} onChange={(e) => setLevelDraft({ ...levelDraft, [openScale]: { ...levelDraft[openScale], rank: e.target.value } })} />
                </div>
                <div className="field">
                  <label>Min score (optional)</label>
                  <input type="number" value={levelDraft[openScale]?.min_score ?? ""} onChange={(e) => setLevelDraft({ ...levelDraft, [openScale]: { ...levelDraft[openScale], min_score: e.target.value } })} />
                </div>
                <div className="field">
                  <label>Max score (optional)</label>
                  <input type="number" value={levelDraft[openScale]?.max_score ?? ""} onChange={(e) => setLevelDraft({ ...levelDraft, [openScale]: { ...levelDraft[openScale], max_score: e.target.value } })} />
                </div>
                <div className="field">
                  <label>Description (optional)</label>
                  <input value={levelDraft[openScale]?.description || ""} onChange={(e) => setLevelDraft({ ...levelDraft, [openScale]: { ...levelDraft[openScale], description: e.target.value } })} />
                </div>
                <div className="field"><label>&nbsp;</label><button className="btn primary" disabled={busy}>Add grade</button></div>
              </form>
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!confirmSwitch}
        title="Switch marking system"
        message={`Switch to ${confirmSwitch === "marks" ? "marks / numbers" : "grades"}? New examinations use the new system; published results keep their original format.`}
        confirmLabel="Switch"
        destructive={false}
        onCancel={() => setConfirmSwitch(null)}
        onConfirm={() => {
          const target = confirmSwitch;
          setConfirmSwitch(null);
          run(
            () => schoolsApi.updateMarkingSystem(user.schoolId, target, false)
              .catch((err) => {
                if (String(apiErrorMessage(err)).includes("confirm")) {
                  return schoolsApi.updateMarkingSystem(user.schoolId, target, true);
                }
                throw err;
              }),
            "Marking system switched"
          );
        }}
      />
    </AdminShell>
  );
}
