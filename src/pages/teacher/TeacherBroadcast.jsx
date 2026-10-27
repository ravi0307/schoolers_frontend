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
import PageHeader from "../../components/ui/PageHeader";
import { apiErrorMessage } from "../../api/client";
import Select from "../../components/ui/Select";
import FormField from "../../components/ui/FormField";
import { splitBroadcastsByAuthor } from "../../utils/broadcastAuthor";
import styles from "./TeacherBroadcast.module.css";

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
      boxShadow: active ? "0 0 0 2px var(--color-row-hover)" : "none",
    };
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorToolbar}>
        <button className={styles.editorTool} style={toolbarButtonStyle("bold")} aria-pressed={!!activeFormats.bold} title="Bold" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")}><b>B</b></button>
        <button className={styles.editorTool} style={toolbarButtonStyle("italic")} aria-pressed={!!activeFormats.italic} title="Italic" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")}><i>I</i></button>
        <button className={styles.editorTool} style={toolbarButtonStyle("underline")} aria-pressed={!!activeFormats.underline} title="Underline" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("underline")}><u>U</u></button>
        <button className={styles.editorTool} style={toolbarButtonStyle("unorderedList")} aria-pressed={!!activeFormats.unorderedList} title="Bulleted list" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertUnorderedList")}>• List</button>
        <button className={styles.editorTool} style={toolbarButtonStyle("orderedList")} aria-pressed={!!activeFormats.orderedList} title="Numbered list" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertOrderedList")}>1. List</button>
        <label
          className={styles.editorColor}
          onMouseDown={(event) => event.preventDefault()}
        >
          Color
          <input
            type="color"
            defaultValue="#0B2338"
            title="Text color"
            aria-label="Text color"
            onChange={(event) => format("foreColor", event.target.value)}
          />
        </label>
        <Select
          aria-label="Font size"
          defaultValue="3"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => format("fontSize", event.target.value)}
          className={styles.editorFontSize}
        >
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <button className={styles.editorTool} title="Insert image" type="button" onMouseDown={(event) => event.preventDefault()} onClick={openImagePicker}>Image</button>
        <button className={styles.editorTool} title="Clear formatting" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("removeFormat")}>Clear</button>
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
        className={styles.editorContent}
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
          <b className={styles.broadcastSender}>
            {senderNameOf(item)}
          </b>
          <span className={styles.broadcastSummary}>
            {richTextToPlainText(item.message)}
          </span>
          <span className={styles.broadcastMetaLine}>
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
            className={styles.broadcastExpanded}
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
      <PageHeader
        title="Broadcast"
        subtitle="Send announcements to the school community"
        action={!formOpen && (
          <button className="btn primary" type="button" onClick={() => setFormOpen(true)}>
            + New Broadcast
          </button>
        )}
      />
      {formOpen && (
        <form className="card white" onSubmit={submit} style={{ marginTop: 14 }}>
          {!editingBroadcastId && (
            <div className="grid2">
            <div className="field">
              <label>Audience</label>
              <Select value={scope} onChange={(event) => {
                setScope(event.target.value);
                if (event.target.value !== "class") setClassId("");
              }} aria-label="Audience">
                <option value="school">Entire school</option>
                <option value="class">Specific class</option>
              </Select>
            </div>
            {scope === "class" && (
              <div className="field">
                <label>Class</label>
                <Select required value={classId} onChange={(event) => setClassId(event.target.value)} aria-label="Class">
                  <option value="">Select class</option>
                  {(myClasses || []).map((item) => (
                    <option key={item.class_id} value={item.class_id}>{item.name}</option>
                  ))}
                </Select>
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

      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
        <div className="card white" style={{ marginTop: 14 }}>
          <div className="grid2">
            <div className="field">
              <FormField label="Search broadcasts">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sender, message, or class"
                />
              </FormField>
            </div>
            <div className="field">
              <label>Filter by audience</label>
              <Select value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)} aria-label="Filter by audience">
                <option value="all">All audiences</option>
                <option value="school">Entire school</option>
                <option value="class">Specific class</option>
                <option value="role_pilot">Pilots</option>
                <option value="role_teacher">Teachers</option>
                <option value="role_admin">School Admin</option>
              </Select>
            </div>
          </div>
          <div className="field">
            <label>Sort by creation date</label>
            <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort by creation date">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </div>
        </div>
        <div className={styles.broadcastColumns}>
          <div className={styles.broadcastPane}>
            <div className={`section-label ${styles.broadcastPaneTitle}`}>Posted (Outgoing)</div>
            <div className={`card ${styles.broadcastCard}`}>
              {postedBroadcasts.length
                ? postedPager.pageItems.map((item) => renderBroadcastRow(item, true))
                : <Empty>{data?.length ? "Nothing posted matches your search or filter." : "Nothing posted yet."}</Empty>}
              <Pagination {...postedPager} />
            </div>
          </div>
          <div className={styles.broadcastPane}>
            <div className={`section-label ${styles.broadcastPaneTitle}`}>Received (Incoming)</div>
            <div className={`card ${styles.broadcastCard}`}>
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
