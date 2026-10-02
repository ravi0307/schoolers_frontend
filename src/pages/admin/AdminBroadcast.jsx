import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";
import RichTextEditor from "../../components/ui/RichTextEditor";
import { richTextToPlainText, sanitizeRichText } from "../../components/ui/richText";
import { splitBroadcastsByAuthor } from "../../utils/broadcastAuthor";
import styles from "./AdminBroadcast.module.css";

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

  const { posted: postedBroadcasts, received: receivedBroadcasts } = useMemo(
    () => splitBroadcastsByAuthor(filteredBroadcasts, user),
    [filteredBroadcasts, user]
  );
  const postedPager = usePagination(postedBroadcasts);
  const receivedPager = usePagination(receivedBroadcasts);

  function renderBroadcastRow(item, editable) {
    const className = classNames.get(String(item.class_id));
    const createdAt = createdAtOf(item);
    const audience =
      item.scope === "class"
        ? `Class: ${className || "Unknown class"}`
        : item.scope === "pilot"
          ? "Pilots"
          : item.scope === "route"
            ? `Route${item.route_id ? ` #${item.route_id}` : ""}`
            : "Entire school";
    const isExpanded = expandedBroadcastId === item.broadcast_id;
    return (
      <div
        key={item.broadcast_id}
        className={`listitem ${styles.broadcastRow}`}
        onClick={() => setExpandedBroadcastId(isExpanded ? null : item.broadcast_id)}
      >
        <div className="avatar y">📣</div>
        <div className={`meta ${styles.broadcastMeta}`}>
          <b className={styles.sender}>
            {senderNameOf(item)}
          </b>
          <span className={styles.message}>
            {richTextToPlainText(item.message)}
          </span>
          <span className={styles.broadcastSummary}>
            {roleNameOf(item)} · {audience} · {createdAt ? formatDate(createdAt) : "Date unavailable"}
          </span>
        </div>
        {editable && (
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
        )}
        {isExpanded && (
          <div
            className={styles.expandedMessage}
            onClick={(event) => event.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.message) }}
          />
        )}
      </div>
    );
  }

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
        <form className={`card white ${styles.formCard}`} onSubmit={submit}>
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
        <div className={`card white ${styles.filterCard}`}>
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
        <div className={styles.broadcastColumns}>
          <div className={styles.broadcastColumn}>
            <div className={`section-label ${styles.columnHeading}`}>Posted (Outgoing)</div>
            <div className={`card ${styles.broadcastList}`}>
              {postedBroadcasts.length
                ? postedPager.pageItems.map((item) => renderBroadcastRow(item, true))
                : <Empty>{data?.length ? "Nothing posted matches your search or filter." : "Nothing posted yet."}</Empty>}
              <Pagination {...postedPager} />
            </div>
          </div>
          <div className={styles.broadcastColumn}>
            <div className={`section-label ${styles.columnHeading}`}>Received (Incoming)</div>
            <div className={`card ${styles.broadcastList}`}>
              {receivedBroadcasts.length
                ? receivedPager.pageItems.map((item) => renderBroadcastRow(item, false))
                : <Empty>{data?.length ? "Nothing received matches your search or filter." : "No broadcasts received yet."}</Empty>}
              <Pagination {...receivedPager} />
            </div>
          </div>
        </div>
        </>
      )}
    </AdminShell>
  );
}
