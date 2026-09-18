import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";
import RichTextEditor from "../../components/ui/RichTextEditor";
import { richTextToPlainText, sanitizeRichText } from "../../components/ui/richText";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function createdAtOf(item) {
  return item.created_at || item.createdAt || item.created || item.timestamp || null;
}

function roleNameOf(item) {
  return item.role_name || item.from_name || "Unknown role";
}

function senderNameOf(item) {
  return item.sender_name || item.senderName || item.from_name || "Unknown sender";
}


export default function AdminBroadcast() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(() => communicationApi.listBroadcasts(), []);
  const { data: classes } = useApi(() => academicsApi.listClasses(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState(null);
  const [scope, setScope] = useState("school");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedBroadcastId, setExpandedBroadcastId] = useState(null);

  const classNames = useMemo(
    () => new Map((classes || []).map((item) => [String(item.class_id ?? item.id), item.name])),
    [classes]
  );

  const filteredBroadcasts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(data || [])]
      .filter((item) => {
        if (audienceFilter === "all") return true;
        if (audienceFilter === "school" || audienceFilter === "class") {
          return item.scope === audienceFilter;
        }
        const role = roleNameOf(item).trim().toLowerCase();
        if (audienceFilter === "role_pilot") return role === "pilot";
        if (audienceFilter === "role_teacher") return role === "teacher";
        if (audienceFilter === "role_admin") return role === "school admin" || role === "admin";
        return item.scope === audienceFilter;
      })
      .filter((item) => {
        if (!query) return true;
        const className = classNames.get(String(item.class_id)) || "";
        return `${roleNameOf(item)} ${senderNameOf(item)} ${richTextToPlainText(item.message)} ${item.scope || ""} ${className}`
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftTime = new Date(createdAtOf(left) || 0).getTime();
        const rightTime = new Date(createdAtOf(right) || 0).getTime();
        return sortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
      });
  }, [audienceFilter, classNames, data, search, sortOrder]);

  function resetForm() {
    setFormOpen(false);
    setEditingBroadcastId(null);
    setScope("school");
    setClassId("");
    setMessage("");
  }

  function startEdit(item) {
    setEditingBroadcastId(item.broadcast_id);
    setScope(item.scope || "school");
    setClassId(item.class_id ? String(item.class_id) : "");
    setMessage(item.message || "");
    setFormOpen(true);
    setExpandedBroadcastId(null);
  }

  function senderNameForRole(role) {
    return {
      admin: "Admin",
      teacher: "Teacher",
      pilot: "Pilot",
      parent: "Parent",
      master: "Master Admin",
    }[role] || "School Admin";
  }

  function senderNameForUser(currentUser) {
    return currentUser?.name || currentUser?.fullName || currentUser?.username || senderNameForRole(currentUser?.role);
  }

  async function submit(event) {
    event.preventDefault();
    if (!richTextToPlainText(message).trim()) {
      toast("Enter a message");
      return;
    }
    if (scope === "class" && !classId) {
      toast("Select a class");
      return;
    }

    setSaving(true);
    try {
      const sanitizedMessage = sanitizeRichText(message);
      if (editingBroadcastId) {
        await communicationApi.updateBroadcast(editingBroadcastId, { message: sanitizedMessage });
        toast("Broadcast updated");
      } else {
        await communicationApi.createBroadcast({
          scope,
          class_id: scope === "class" ? Number(classId) : null,
          role_name: senderNameForRole(user?.role),
          sender_name: senderNameForUser(user),
          message: sanitizedMessage,
        });
        toast("Broadcast sent");
      }
      resetForm();
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Broadcast</div>
      <div className="scr-sub">Send announcements to the school community</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!formOpen && (
        <button className="btn primary" type="button" onClick={() => setFormOpen(true)}>
          + New Broadcast
        </button>
      )}

      {formOpen && (
        <form className="card white" onSubmit={submit} style={{ marginTop: 14 }}>
          {!editingBroadcastId && (
            <div className="grid2">
            <div className="field">
              <label>Audience</label>
              <select value={scope} onChange={(event) => {
                setScope(event.target.value);
                if (event.target.value !== "class") setClassId("");
              }}>
                <option value="school">Entire school</option>
                <option value="class">Specific class</option>
              </select>
            </div>
            {scope === "class" && (
              <div className="field">
                <label>Class</label>
                <select required value={classId} onChange={(event) => setClassId(event.target.value)}>
                  <option value="">Select class</option>
                  {(classes || []).map((item) => (
                    <option key={item.class_id} value={item.class_id}>{item.name}</option>
                  ))}
                </select>
              </div>
            )}
            </div>
          )}
          <div className="field">
            <label>Message</label>
            <RichTextEditor value={message} onChange={setMessage} />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingBroadcastId ? "Update Broadcast" : "Send Broadcast"}
            </button>
            <button className="btn ghost" type="button" onClick={resetForm} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      {!loading && !error && (
        <>
        <div className="card white" style={{ marginTop: 14 }}>
          <div className="grid2">
            <div className="field">
              <label>Search broadcasts</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search sender, message, or class"
              />
            </div>
            <div className="field">
              <label>Filter by audience</label>
              <select value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
                <option value="all">All audiences</option>
                <option value="school">Entire school</option>
                <option value="class">Specific class</option>
                <option value="role_pilot">Pilots</option>
                <option value="role_teacher">Teachers</option>
                <option value="role_admin">School Admin</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Sort by creation date</label>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        <div className="card" style={{ marginTop: 14, padding: "8px 16px", maxHeight: 560, overflowY: "auto" }}>
          {filteredBroadcasts.length ? filteredBroadcasts.map((item) => {
            const className = classNames.get(String(item.class_id));
            const createdAt = createdAtOf(item);
            const audience = item.scope === "class"
              ? `Class: ${className || "Unknown class"}`
              : item.scope === "pilot"
                ? "Pilots"
                : "Entire school";
            const isExpanded = expandedBroadcastId === item.broadcast_id;
            return (
            <div
              key={item.broadcast_id}
              className="listitem"
              onClick={() => setExpandedBroadcastId(isExpanded ? null : item.broadcast_id)}
              style={{
                cursor: "pointer",
                flexWrap: "wrap",
                alignItems: "flex-start",
                overflow: "hidden",
              }}
            >
              <div className="avatar y">📣</div>
              <div className="meta" style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden" }}>
                <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {senderNameOf(item)}
                </b>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {richTextToPlainText(item.message)}
                </span>
                <span style={{ display: "block", marginTop: 4, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {roleNameOf(item)} · {audience} · {createdAt ? formatDate(createdAt) : "Date unavailable"}
                </span>
              </div>
              <button
                className="btn ghost sm"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  startEdit(item);
                }}
              >
                Edit
              </button>
              {isExpanded && (
                <div
                  style={{
                    flexBasis: "100%",
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#eef7fa",
                    color: "#0f172a",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                  onClick={(event) => event.stopPropagation()}
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.message) }}
                />
              )}
            </div>
            );
          }) : <Empty>{data?.length ? "No broadcasts match your search or filter." : "No broadcasts yet."}</Empty>}
        </div>
        </>
      )}
    </AdminShell>
  );
}
