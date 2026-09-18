import { useEffect, useMemo, useRef, useState } from "react";
import TeacherShell from "../../components/layout/TeacherShell";
import { useAuth } from "../../context/AuthContext";
import { useTeacherContext } from "../../context/TeacherContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import * as academicsApi from "../../api/academics";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";

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

const ALLOWED_RICH_TEXT_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "BR", "P", "FONT", "IMG"]);
const FONT_SIZE_OPTIONS = [
  { value: "1", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "5", label: "Large" },
  { value: "7", label: "Huge" },
];

function sanitizeRichText(value) {
  if (typeof document === "undefined") return value || "";
  const container = document.createElement("div");
  container.innerHTML = value || "";
  container.querySelectorAll("*").forEach((element) => {
    if (!ALLOWED_RICH_TEXT_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    if (element.tagName === "IMG") {
      const source = element.getAttribute("src") || "";
      if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(source)) {
        element.remove();
        return;
      }
      const alt = element.getAttribute("alt") || "Uploaded image";
      element.setAttribute("alt", alt.slice(0, 120));
      Array.from(element.attributes).forEach((attribute) => {
        if (!["src", "alt"].includes(attribute.name)) element.removeAttribute(attribute.name);
      });
    } else if (element.tagName === "FONT") {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name === "color") {
          const color = attribute.value.trim();
          if (!/^#[0-9a-f]{3,8}$/i.test(color) && !/^(rgb|rgba|hsl|hsla)\(/i.test(color)) {
            element.removeAttribute(attribute.name);
          }
        } else if (attribute.name === "size") {
          if (!/^[1-7]$/.test(attribute.value)) element.removeAttribute(attribute.name);
        } else {
          element.removeAttribute(attribute.name);
        }
      });
    } else {
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
    }
  });
  return container.innerHTML.trim();
}

function richTextToPlainText(value) {
  if (typeof document === "undefined") return String(value || "").replace(/<[^>]*>/g, " ");
  const container = document.createElement("div");
  container.innerHTML = value || "";
  return container.textContent || "";
}

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const sanitizedValue = sanitizeRichText(value);
  const [activeFormats, setActiveFormats] = useState({});

  function updateActiveFormats() {
    const selection = window.getSelection();
    if (!editorRef.current || !selection?.anchorNode || !editorRef.current.contains(selection.anchorNode)) return;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
    });
  }

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== sanitizedValue) {
      editorRef.current.innerHTML = sanitizedValue;
    }
  }, [sanitizedValue]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, []);

  function format(command, commandValue = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
    updateActiveFormats();
  }

  function handleInput() {
    onChange(editorRef.current?.innerHTML || "");
    updateActiveFormats();
  }

  function handlePaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!editorRef.current || !selection?.rangeCount || !editorRef.current.contains(selection.anchorNode)) return;
    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function openImagePicker() {
    saveSelection();
    imageInputRef.current?.click();
  }

  function insertImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Please choose an image smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const editor = editorRef.current;
      if (!editor || typeof reader.result !== "string") return;
      editor.focus();
      const selection = window.getSelection();
      const range = savedSelectionRef.current || document.createRange();
      if (!savedSelectionRef.current) {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("insertImage", false, reader.result);
      const image = editor.querySelector(`img[src="${CSS.escape(reader.result)}"]`);
      if (image) image.setAttribute("alt", file.name);
      onChange(editor.innerHTML);
      savedSelectionRef.current = null;
    };
    reader.readAsDataURL(file);
  }

  function toolbarButtonStyle(command) {
    const active = !!activeFormats[command];
    return {
      background: active ? "var(--chalk-green)" : "transparent",
      color: active ? "var(--paper-light)" : "var(--ink)",
      borderColor: active ? "var(--chalk-green)" : "var(--line)",
      boxShadow: active ? "0 0 0 2px rgba(2, 56, 89, .16)" : "none",
    };
  }

  return (
    <div style={{ border: "1.5px solid var(--line)", borderRadius: 9, overflow: "hidden", background: "var(--paper-light)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <button className="btn ghost sm" style={toolbarButtonStyle("bold")} aria-pressed={!!activeFormats.bold} title="Bold" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")}><b>B</b></button>
        <button className="btn ghost sm" style={toolbarButtonStyle("italic")} aria-pressed={!!activeFormats.italic} title="Italic" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")}><i>I</i></button>
        <button className="btn ghost sm" style={toolbarButtonStyle("underline")} aria-pressed={!!activeFormats.underline} title="Underline" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("underline")}><u>U</u></button>
        <button className="btn ghost sm" style={toolbarButtonStyle("unorderedList")} aria-pressed={!!activeFormats.unorderedList} title="Bulleted list" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertUnorderedList")}>• List</button>
        <button className="btn ghost sm" style={toolbarButtonStyle("orderedList")} aria-pressed={!!activeFormats.orderedList} title="Numbered list" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertOrderedList")}>1. List</button>
        <label
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0 7px", border: "1.5px solid var(--line)", borderRadius: 9, color: "var(--ink)", fontSize: 11.5 }}
          onMouseDown={(event) => event.preventDefault()}
        >
          Color
          <input
            type="color"
            defaultValue="#0B2338"
            title="Text color"
            aria-label="Text color"
            onChange={(event) => format("foreColor", event.target.value)}
            style={{ width: 24, height: 24, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
          />
        </label>
        <select
          aria-label="Font size"
          defaultValue="3"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => format("fontSize", event.target.value)}
          style={{ width: 110, padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 9, background: "var(--paper-light)", color: "var(--ink)", fontSize: 11.5 }}
        >
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className="btn ghost sm" title="Insert image" type="button" onMouseDown={(event) => event.preventDefault()} onClick={openImagePicker}>🖼️ Image</button>
        <button className="btn ghost sm" title="Clear formatting" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("removeFormat")}>Clear</button>
        <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={insertImage} hidden />
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        style={{ minHeight: 150, padding: "10px 12px", outline: "none", fontSize: 13.5, lineHeight: 1.5, overflowWrap: "anywhere" }}
      >
        {null}
      </div>
    </div>
  );
}

export default function AdminBroadcast() {
  const { user } = useAuth();
  const { classIds } = useTeacherContext();
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

  const myClasses = useMemo(
    () => (classes || []).filter((item) => classIds.includes(item.class_id ?? item.id)),
    [classes, classIds]
  );

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

  const myName = senderNameForUser(user);
  const postedBroadcasts = useMemo(
    () => filteredBroadcasts.filter((item) => senderNameOf(item) === myName),
    [filteredBroadcasts, myName]
  );
  const receivedBroadcasts = useMemo(
    () => filteredBroadcasts.filter((item) => senderNameOf(item) !== myName),
    [filteredBroadcasts, myName]
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
    if (scope === "class" && !myClasses.some((c) => String(c.class_id ?? c.id) === String(classId))) {
      toast("Select one of your teaching classes");
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
    <TeacherShell>
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
                  {(myClasses || []).map((item) => (
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
        <div
          className="grid2"
          style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start", marginTop: 18 }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Posted (Outgoing)</div>
            <div className="card" style={{ padding: "8px 16px", maxHeight: 520, overflowY: "auto" }}>
              {postedBroadcasts.length
                ? postedPager.pageItems.map((item) => renderBroadcastRow(item, true))
                : <Empty>{data?.length ? "Nothing posted matches your search or filter." : "Nothing posted yet."}</Empty>}
              <Pagination {...postedPager} />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Received (Incoming)</div>
            <div className="card" style={{ padding: "8px 16px", maxHeight: 520, overflowY: "auto" }}>
              {receivedBroadcasts.length
                ? receivedPager.pageItems.map((item) => renderBroadcastRow(item, false))
                : <Empty>{data?.length ? "Nothing received matches your search or filter." : "No broadcasts received yet."}</Empty>}
              <Pagination {...receivedPager} />
            </div>
          </div>
        </div>
        </>
      )}
    </TeacherShell>
  );
}
