import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as peopleApi from "../../api/people";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { Spinner, ErrorBanner, Empty, Pill, initials } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import PageHeader from "../../components/ui/PageHeader";
import ImageUpload from "../../components/ui/ImageUpload";
import DocumentUpload from "../../components/ui/DocumentUpload";
import Select from "../../components/ui/Select";
import FormField from "../../components/ui/FormField";
import DatePicker from "../../components/ui/DatePicker";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client";
import styles from "./AdminStudents.module.css";

function getValue(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
}

export default function AdminStudents() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi(() => peopleApi.listStudents({ search: search || undefined }), [search]);
  const { data: classes } = useApi(() => academicsApi.listClasses(), []);
  const toast = useToast();
  const pager = usePagination(data);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [birthCertificateNumber, setBirthCertificateNumber] = useState("");
  const [documents, setDocuments] = useState([]);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [parentEmergencyNumber, setParentEmergencyNumber] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [rollNumber, setRollNumber] = useState(null);
  const [showRollNotice, setShowRollNotice] = useState(false);

  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAdmissionNo, setEditAdmissionNo] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editAadhaarNumber, setEditAadhaarNumber] = useState("");
  const [editBirthCertificateNumber, setEditBirthCertificateNumber] = useState("");
  const [editDocuments, setEditDocuments] = useState([]);
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentAddress, setEditParentAddress] = useState("");
  const [editParentEmergencyNumber, setEditParentEmergencyNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setClassId("");
    setDateOfBirth("");
    setGender("");
    setPhotoUrl("");
    setAadhaarNumber("");
    setBirthCertificateNumber("");
    setDocuments([]);
    setParentName("");
    setParentPhone("");
    setParentEmail("");
    setParentAddress("");
    setParentEmergencyNumber("");
    setFormErrors({});
    setRollNumber(null);
    setShowRollNotice(false);
    setFormOpen(false);
    setEditingStudentId(null);
  }

  async function submit(e) {
    e.preventDefault();
    const errors = {};
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      errors.name = "Full name is required";
    } else if (nameTrimmed.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (!classId) {
      errors.classId = "Please select a class";
    }
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob > today) {
        errors.dateOfBirth = "Date of birth cannot be in the future";
      }
    }
    if (parentEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentEmail.trim())) {
      errors.parentEmail = "Invalid email address";
    }
    if (parentPhone) {
      const digits = parentPhone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        errors.parentPhone = "Phone must have 10 to 15 digits";
      }
    }
    if (parentEmergencyNumber) {
      const digits = parentEmergencyNumber.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        errors.parentEmergencyNumber = "Emergency number must have 10 to 15 digits";
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setShowRollNotice(true);
    setSubmitting(true);
    try {
      const result = await peopleApi.createStudent({
        name: nameTrimmed,
        class_id: Number(classId),
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        photo_url: photoUrl || null,
        aadhaar_number: aadhaarNumber || null,
        birth_certificate_number: birthCertificateNumber || null,
        documents: documents.length ? documents : null,
        parent_name: parentName || null,
        parent_phone: parentPhone || null,
        parent_email: parentEmail || null,
        parent_address: parentAddress || null,
        parent_emergency_number: parentEmergencyNumber || null,
      });
      setRollNumber(result.roll_number || null);
      toast(nameTrimmed + " added — Roll No: " + (result.roll_number || "generated"));
      resetForm();
      refetch();
    } catch (err) {
      setShowRollNotice(false);
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStudent(id) {
    const errors = {};
    const editNameTrimmed = editName.trim();
    if (!editNameTrimmed) {
      errors.name = "Student name is required";
    } else if (editNameTrimmed.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (!editClassId) {
      errors.classId = "Please select a class";
    }
    if (editDateOfBirth) {
      const dob = new Date(editDateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob > today) {
        errors.dateOfBirth = "Date of birth cannot be in the future";
      }
    }
    if (editParentEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(editParentEmail.trim())) {
      errors.parentEmail = "Invalid email address";
    }
    if (editParentPhone) {
      const digits = editParentPhone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        errors.parentPhone = "Phone must have 10 to 15 digits";
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const payload = {
      name: editNameTrimmed,
      admission_no: editAdmissionNo.trim(),
      class_id: Number(editClassId),
      date_of_birth: editDateOfBirth || null,
      gender: editGender || null,
      photo_url: editPhotoUrl || "",
      aadhaar_number: editAadhaarNumber || "",
      birth_certificate_number: editBirthCertificateNumber || "",
      documents: editDocuments.length ? editDocuments : [],
      parent_name: editParentName || null,
      parent_phone: editParentPhone || null,
      parent_email: editParentEmail || null,
      parent_address: editParentAddress || null,
      parent_emergency_number: editParentEmergencyNumber || null,
    };
    try {
      await peopleApi.updateStudent(id, payload);
      toast("Student updated — Roll number unchanged");
      setEditingStudentId(null);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function remove(id) {
    try {
      await peopleApi.deleteStudent(id);
      toast("Student removed");
      if (expandedStudentId === id) setExpandedStudentId(null);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  function toggleExpanded(id) {
    setExpandedStudentId((current) => (current === id ? null : id));
  }

  return (
    <AdminShell>
      <PageHeader
        title="Student List"
        subtitle="School-wide roster"
        action={!formOpen && (
          <button className="btn gold" type="button" onClick={() => setFormOpen(true)}>+ Add Student</button>
        )}
      />

      {formOpen && (
        <form className={`card white ${styles.formCard}`} onSubmit={submit}>
          {rollNumber && (
            <div className="field span-2">
              <span className={styles.rollNumberBadge}>
                Roll No: {rollNumber}
              </span>
            </div>
          )}
          {showRollNotice && !rollNumber && (
            <div className="field span-2">
              <span className={styles.rollNotice}>
                Roll number will be generated automatically after enrollment.
              </span>
            </div>
          )}
          <div className="grid2 form-grid">
            <div className="field">
              <label>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aisha Verma"
              />
              {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
            </div>
            <div className="field">
              <label>Class</label>
              <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
                <option value="">Select a class</option>
                {(classes || []).map((c) => (
                  <option key={c.class_id} value={c.class_id}>{c.name}</option>
                ))}
              </Select>
              {formErrors.classId && <span className={styles.errorText}>{formErrors.classId}</span>}
            </div>
            <div className="field">
              <label>Date of birth</label>
              <DatePicker type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} aria-label="Date of birth" />
              {formErrors.dateOfBirth && <span className={styles.errorText}>{formErrors.dateOfBirth}</span>}
            </div>
            <div className="field">
              <label>Gender</label>
              <Select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="span-2">
              <ImageUpload
                label="Image (passport size)"
                hint="Recent passport-size photo. JPEG, PNG, GIF, WebP, or SVG up to 5 MB."
                value={photoUrl}
                onChange={setPhotoUrl}
                onError={toast}
                schoolId={user?.schoolId}
              />
            </div>
            <div className="field">
              <label>Aadhaar card number</label>
              <input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} maxLength="20" placeholder="12-digit Aadhaar number" />
            </div>
            <div className="field">
              <label>Birth certificate number</label>
              <input value={birthCertificateNumber} onChange={(e) => setBirthCertificateNumber(e.target.value)} maxLength="40" placeholder="Birth certificate number" />
            </div>
            <div className="span-2">
              <DocumentUpload
                label="Documents"
                value={documents}
                onChange={setDocuments}
                onError={toast}
                schoolId={user?.schoolId}
              />
            </div>
            <div className="field">
              <label>Parent name</label>
              <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Anvi Swaminathan" />
            </div>
            <div className="field">
              <label>Parent phone</label>
              <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. 98xxxx0000" />
              {formErrors.parentPhone && <span className={styles.errorText}>{formErrors.parentPhone}</span>}
            </div>
            <div className="field">
              <label>Parent email</label>
              <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
              {formErrors.parentEmail && <span className={styles.errorText}>{formErrors.parentEmail}</span>}
            </div>
            <div className="field">
              <label>Parent emergency number</label>
              <input value={parentEmergencyNumber} onChange={(e) => setParentEmergencyNumber(e.target.value)} placeholder="e.g. 98xxxx0000" />
              {formErrors.parentEmergencyNumber && <span className={styles.errorText}>{formErrors.parentEmergencyNumber}</span>}
            </div>
            <div className="field span-2">
              <label>Parent address</label>
              <textarea rows={3} value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} placeholder="Parent address" />
            </div>
            <div className="cta-row">
              <button className="btn primary" type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Student"}
              </button>
              <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      <div className="field">
        <FormField label="Search by name or admission no.">
          <input
            placeholder="Search by name or admission no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormField>
      </div>

      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            pager.pageItems.map((s) => {
              const isExpanded = expandedStudentId === s.student_id;
              const className = (classes || []).find((c) => c.class_id === s.class_id)?.name || "Unassigned";
              const studentDOB = getValue(s, ["date_of_birth", "dob"]) || "Not provided";
              const studentGender = getValue(s, ["gender"]) || "Not provided";
              const parentNameValue = getValue(s, ["parent_name", "guardian_name"]) || "Not provided";
              const parentPhoneValue = getValue(s, ["parent_phone", "guardian_phone"]) || "Not provided";
              const parentEmailValue = getValue(s, ["parent_email", "guardian_email"]) || "Not provided";
              const parentAddressValue = getValue(s, ["parent_address", "guardian_address"]) || "Not provided";
              const parentEmergencyValue = getValue(s, ["parent_emergency_number", "guardian_emergency_number"]) || "Not provided";

              return (
                <div key={s.student_id} className={styles.studentEntry}>
                  <div
                    className={`listitem ${styles.studentRow}`}
                    onClick={() => toggleExpanded(s.student_id)}
                  >
                    <div className={styles.studentPrimary}>
                      <div className="avatar">{initials(s.name)}</div>
                      <div className={styles.studentName}>
                        {s.name}
                      </div>
                    </div>

                    <div className={styles.studentAdmission}>
                      {s.admission_no}
                    </div>

                    <div className={styles.studentAdmission}>
                      {s.roll_number ? <span>Roll: {s.roll_number}</span> : <span>Roll: —</span>}
                    </div>

                    <div className={`cta-row ${styles.studentActions}`} onClick={(e) => e.stopPropagation()}>
                      <Pill tone={s.present_today ? "ok" : "warn"}>{s.present_today ? "Present" : "Absent"}</Pill>
                      <button
                        className="btn ghost sm"
                        onClick={() => {
                          setEditingStudentId(s.student_id);
                          setEditName(s.name || "");
                          setEditAdmissionNo(s.admission_no || "");
                          setEditClassId(String(s.class_id || ""));
                          setEditDateOfBirth(getValue(s, ["date_of_birth", "dob"]) || "");
                          setEditGender(getValue(s, ["gender"]) || "");
                          setEditPhotoUrl(getValue(s, ["photo_url"]) || "");
                          setEditAadhaarNumber(getValue(s, ["aadhaar_number"]) || "");
                          setEditBirthCertificateNumber(getValue(s, ["birth_certificate_number"]) || "");
                          setEditDocuments(Array.isArray(s.documents) ? s.documents : []);
                          setEditParentName(getValue(s, ["parent_name", "guardian_name"]) || "");
                          setEditParentPhone(getValue(s, ["parent_phone", "guardian_phone"]) || "");
                          setEditParentEmail(getValue(s, ["parent_email", "guardian_email"]) || "");
                          setEditParentAddress(getValue(s, ["parent_address", "guardian_address"]) || "");
                          setEditParentEmergencyNumber(getValue(s, ["parent_emergency_number", "guardian_emergency_number"]) || "");
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn ghost sm" onClick={() => remove(s.student_id)}>Remove</button>
                    </div>
                  </div>

                  {editingStudentId === s.student_id && (
                    <div className={`card white ${styles.editCard}`}>
                      {s.roll_number && (
                        <div className="field span-2">
                          <label>Roll number (auto-generated, cannot be changed)</label>
                          <input
                            value={s.roll_number}
                            readOnly
                            className={styles.readonlyField}
                          />
                        </div>
                      )}
                      <div className="field">
                        <label>Student name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
                      </div>
                      <div className="field">
                        <label>Admission no.</label>
                        <input value={editAdmissionNo} onChange={(e) => setEditAdmissionNo(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Class</label>
                        <Select value={editClassId} onChange={(e) => setEditClassId(e.target.value)} aria-label="Class">
                          <option value="">Select a class</option>
                          {(classes || []).map((c) => (
                            <option key={c.class_id} value={c.class_id}>{c.name}</option>
                          ))}
                        </Select>
                        {formErrors.classId && <span className={styles.errorText}>{formErrors.classId}</span>}
                      </div>
                      <div className="field">
                        <label>Date of birth</label>
                        <DatePicker type="date" value={editDateOfBirth} onChange={(e) => setEditDateOfBirth(e.target.value)} aria-label="Date of birth" />
                        {formErrors.dateOfBirth && <span className={styles.errorText}>{formErrors.dateOfBirth}</span>}
                      </div>
                      <div className="field">
                        <label>Gender</label>
                        <Select value={editGender} onChange={(e) => setEditGender(e.target.value)} aria-label="Gender">
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </Select>
                      </div>
                      <ImageUpload
                        label="Photo (passport size)"
                        value={editPhotoUrl}
                        onChange={setEditPhotoUrl}
                        onError={toast}
                        schoolId={user?.schoolId}
                      />
                      <div className="field">
                        <label>Aadhaar card number</label>
                        <input value={editAadhaarNumber} onChange={(e) => setEditAadhaarNumber(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Birth certificate number</label>
                        <input value={editBirthCertificateNumber} onChange={(e) => setEditBirthCertificateNumber(e.target.value)} />
                      </div>
                      <DocumentUpload
                        label="Documents"
                        value={editDocuments}
                        onChange={setEditDocuments}
                        onError={toast}
                        schoolId={user?.schoolId}
                      />
                      <div className="field">
                        <label>Parent name</label>
                        <input value={editParentName} onChange={(e) => setEditParentName(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Parent phone</label>
                        <input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} />
                        {formErrors.parentPhone && <span className={styles.errorText}>{formErrors.parentPhone}</span>}
                      </div>
                      <div className="field">
                        <label>Parent email</label>
                        <input type="email" value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} />
                        {formErrors.parentEmail && <span className={styles.errorText}>{formErrors.parentEmail}</span>}
                      </div>
                      <div className="field">
                        <label>Parent address</label>
                        <textarea rows={3} value={editParentAddress} onChange={(e) => setEditParentAddress(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Parent emergency number</label>
                        <input value={editParentEmergencyNumber} onChange={(e) => setEditParentEmergencyNumber(e.target.value)} />
                        {formErrors.parentEmergencyNumber && <span className={styles.errorText}>{formErrors.parentEmergencyNumber}</span>}
                      </div>
                      <div className="cta-row">
                        <button className="btn primary sm" onClick={() => updateStudent(s.student_id)}>Save</button>
                        <button className="btn ghost sm" onClick={() => setEditingStudentId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className={styles.studentDetails}>
                      <div className={styles.studentsHeading}>Student Details</div>
                      <div className={styles.detailsGrid}>
                        {s.photo_url ? (
                          <div className={`${styles.detailItem} ${styles.detailWide}`}>
                            <div className={styles.detailLabel}>
                              Photo
                            </div>
                            <a href={resolveMediaUrl(s.photo_url)} target="_blank" rel="noreferrer" className={styles.photoLink}>
                              <img src={resolveMediaUrl(s.photo_url)} alt={s.name} className={styles.studentPhoto} />
                            </a>
                          </div>
                        ) : null}
                        {[
                          ["Name", s.name],
                          ["Admission No", s.admission_no || "Not provided"],
                          ["Roll Number", s.roll_number || "Not provided"],
                          ["Class", className],
                          ["Status", s.present_today ? "Present" : "Absent"],
                          ["Date of Birth", studentDOB],
                          ["Gender", studentGender],
                          ["Aadhaar Card Number", getValue(s, ["aadhaar_number"]) || "Not provided"],
                          ["Birth Certificate Number", getValue(s, ["birth_certificate_number"]) || "Not provided"],
                          ["Parent Name", parentNameValue],
                          ["Parent Phone", parentPhoneValue],
                          ["Parent Email", parentEmailValue],
                          ["Parent Emergency Number", parentEmergencyValue],
                        ].map(([label, value]) => (
                          <div key={label} className={styles.detailItem}>
                            <div className={styles.detailLabel}>
                              {label}
                            </div>
                            <div className={styles.detailValue}>{value}</div>
                          </div>
                        ))}
                        <div className={`${styles.detailItem} ${styles.detailWide}`}>
                          <div className={styles.detailLabel}>
                            Documents
                          </div>
                          <div className={styles.detailValue}>
                            {Array.isArray(s.documents) && s.documents.length ? (
                              s.documents.map((doc) => {
                                const name = doc.split("/").pop() || doc;
                                return (
                                  <div key={doc}>
                                    <a href={resolveMediaUrl(doc)} target="_blank" rel="noreferrer" className={styles.documentLink}>{name}</a>
                                  </div>
                                );
                              })
                            ) : (
                              "Not provided"
                            )}
                          </div>
                        </div>
                        <div className={`${styles.detailItem} ${styles.detailWide}`}>
                          <div className={styles.detailLabel}>
                            Parent Address
                          </div>
                          <div className={styles.detailValue}>{parentAddressValue}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Empty>No students match.</Empty>
          )}
          <Pagination {...pager} />
        </div>
      )}

    </AdminShell>
  );
}
