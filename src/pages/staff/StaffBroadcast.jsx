import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import { Megaphone, Plus } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import styles from "./StaffBroadcast.module.css";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import * as academicsApi from "../../api/academics";
import * as transportApi from "../../api/transport";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, ConfirmDialog } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";
import RichTextEditor from "../../components/ui/RichTextEditor";
import { richTextToPlainText, sanitizeRichText } from "../../components/ui/richText";
import { splitBroadcastsByAuthor } from "../../utils/broadcastAuthor";

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

export default function StaffBroadcast() {
  const location = useLocation();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(() => communicationApi.listBroadcasts(), []);
  const { data: classes } = useApi(() => academicsApi.listClasses(), []);
  const { data: routes } = useApi(() => transportApi.listRoutes(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState(null);
  const [scope, setScope] = useState("school");
  const [classId, setClassId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedBroadcastId, setExpandedBroadcastId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const classNames = useMemo(
    () => new Map((classes || []).map((item) => [String(item.class_id ?? item.id), item.name])),
    [classes]
  );
  const routeNames = useMemo(
    () => new Map((routes || []).map((item) => [String(item.route_id ?? item.id), item.name])),
    [routes]
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

  function audienceOf(item) {
    if (item.scope === "class") {
      return `Class: ${classNames.get(String(item.class_id)) || "Unknown class"}`;
    }
    if (item.scope === "route") {
      const name = routeNames.get(String(item.route_id));
      if (name) return `Route: ${name}`;
      return item.route_id ? `Route #${item.route_id}` : "Route";
    }
    if (item.scope === "pilot") return "Pilots";
    return "Entire school";
  }

  function renderBroadcastRow(item, editable) {
    const createdAt = createdAtOf(item);
    const isExpanded = expandedBroadcastId === item.broadcast_id;
    return (
      <div
        key={item.broadcast_id}
        className={`listitem ${styles.broadcastRow}`}
        onClick={() => setExpandedBroadcastId(isExpanded ? null : item.broadcast_id)}
      >
        <div className={`avatar y ${styles.broadcastAvatar}`}><Megaphone aria-hidden="true" /></div>
        <div className={`meta ${styles.broadcastMeta}`}>
          <b className={styles.broadcastName}>
            {senderNameOf(item)}
          </b>
          <span className={styles.broadcastMessage}>
            {richTextToPlainText(item.message)}
          </span>
          <span className={styles.broadcastDetails}>
            {roleNameOf(item)} · {audienceOf(item)} · {createdAt ? formatDate(createdAt) : "Date unavailable"}
          </span>
        </div>
        {editable && (
          <div className={`cta-row ${styles.rowActions}`}>
            <Button
              variant="subtle"
              className={styles.compactButton}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                startEdit(item);
              }}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              className={styles.compactButton}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPendingDelete(item);
              }}
            >
              Delete
            </Button>
          </div>
        )}
        {isExpanded && (
          <div
            className={styles.expandedBody}
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
    setRouteId("");
    setMessage("");
  }

  function startEdit(item) {
    setEditingBroadcastId(item.broadcast_id);
    setScope(item.scope || "school");
    setClassId(item.class_id ? String(item.class_id) : "");
    setRouteId(item.route_id ? String(item.route_id) : "");
    setMessage(item.message || "");
    setFormOpen(true);
    setExpandedBroadcastId(null);
  }

  function changeScope(nextScope) {
    setScope(nextScope);
    if (nextScope !== "class") setClassId("");
    if (nextScope !== "route") setRouteId("");
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
    if (scope === "route" && !routeId) {
      toast("Select a route");
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
          route_id: scope === "route" ? Number(routeId) : null,
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

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await communicationApi.deleteBroadcast(pendingDelete.broadcast_id);
      toast("Broadcast deleted");
      setPendingDelete(null);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Broadcast"
        subtitle="Send announcements to the school community"
        action={!formOpen && (
          <Button variant="primary" type="button" onClick={() => setFormOpen(true)}>
            <Plus aria-hidden="true" /> New Broadcast
          </Button>
        )}
      />
      {location.state?.accessDenied && (
        <ErrorBanner message="That page is not available to staff. You have been returned to Broadcast." />
      )}
      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {formOpen && (
        <Card as="form" className={`card white ${styles.formCard}`} onSubmit={submit}>
          {!editingBroadcastId && (
            <div className="grid2">
              <FormField id="broadcast-audience" label="Audience">
                <select id="broadcast-audience" value={scope} onChange={(event) => changeScope(event.target.value)}>
                  <option value="school">Entire school</option>
                  <option value="class">Specific class</option>
                  <option value="route">Specific route</option>
                  <option value="pilot">Pilots</option>
                </select>
              </FormField>
              {scope === "class" && (
                <FormField id="broadcast-class" label="Class" required>
                  <select id="broadcast-class" required value={classId} onChange={(event) => setClassId(event.target.value)}>
                    <option value="">Select class</option>
                    {(classes || []).map((item) => (
                      <option key={item.class_id} value={item.class_id}>{item.name}</option>
                    ))}
                  </select>
                </FormField>
              )}
              {scope === "route" && (
                <FormField id="broadcast-route" label="Route" required>
                  <select id="broadcast-route" required value={routeId} onChange={(event) => setRouteId(event.target.value)}>
                    <option value="">Select route</option>
                    {(routes || []).map((item) => (
                      <option key={item.route_id} value={item.route_id}>{item.name}</option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
          )}
          <FormField id="broadcast-message" label="Message">
            <RichTextEditor id="broadcast-message" value={message} onChange={setMessage} />
          </FormField>
          <div className="cta-row">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingBroadcastId ? "Update Broadcast" : "Send Broadcast"}
            </Button>
            <Button variant="outline" type="button" onClick={resetForm} disabled={saving}>Cancel</Button>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Card className={`card white ${styles.filters}`}>
            <div className="grid2">
              <FormField id="broadcast-search" label="Search broadcasts">
                <input
                  id="broadcast-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sender, message, or class"
                />
              </FormField>
              <FormField id="broadcast-audience-filter" label="Filter by audience">
                <select id="broadcast-audience-filter" value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
                  <option value="all">All audiences</option>
                  <option value="school">Entire school</option>
                  <option value="class">Specific class</option>
                  <option value="route">Specific route</option>
                  <option value="pilot">Pilots</option>
                  <option value="role_teacher">Teachers</option>
                  <option value="role_admin">School Admin</option>
                </select>
              </FormField>
            </div>
            <FormField id="broadcast-sort" label="Sort by creation date">
              <select id="broadcast-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </FormField>
          </Card>
          <div className={styles.broadcastColumns}>
            <div className={styles.broadcastColumn}>
              <h2 className={`section-label ${styles.sectionHeading}`}>Posted (Outgoing)</h2>
              <Card className={`card ${styles.broadcastList}`}>
                {postedBroadcasts.length
                  ? postedPager.pageItems.map((item) => renderBroadcastRow(item, true))
                  : <EmptyState>{data?.length ? "Nothing posted matches your search or filter." : "Nothing posted yet."}</EmptyState>}
                <Pagination {...postedPager} />
              </Card>
            </div>
            <div className={styles.broadcastColumn}>
              <h2 className={`section-label ${styles.sectionHeading}`}>Received (Incoming)</h2>
              <Card className={`card ${styles.broadcastList}`}>
                {receivedBroadcasts.length
                  ? receivedPager.pageItems.map((item) => renderBroadcastRow(item, false))
                  : <EmptyState>{data?.length ? "Nothing received matches your search or filter." : "No broadcasts received yet."}</EmptyState>}
                <Pagination {...receivedPager} />
              </Card>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this broadcast?"
        message="This will remove the broadcast from the school feed."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </>
  );
}
