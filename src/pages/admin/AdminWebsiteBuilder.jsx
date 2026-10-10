import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Image as ImageIcon,
  Inbox,
  Italic,
  List,
  ListOrdered,
  MessageSquareText,
  Save,
  Sparkles,
  Trash2,
  X,
  ExternalLink,
  History,
} from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import PublicSiteCanvas from "../../components/site/PublicSiteCanvas";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client";
import * as websiteApi from "../../api/website";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { publicSitePath } from "../../utils/siteFlow";
import { sanitizeRichText } from "../../components/ui/richText";
import {
  DEFAULT_WEBSITE_CANVAS_SIZE,
  normalizeWebsiteCanvasSize,
  addWebsiteVersion,
  readWebsiteVersionHistory,
  restoreWebsiteVersionContent,
  writeWebsiteVersionHistory,
  writeLocalWebsiteDraft,
  WEBSITE_CANVAS_LIMITS,
  createDefaultWebsiteNodes,
  MOCK_ACTIVE_TESTIMONIALS,
  MOCK_PENDING_TESTIMONIALS,
  approveQueuedTestimonial,
  normalizeWebsiteBuilderNodes,
  resizeHandleClassName,
  resizeDimensionsTooltip,
  resizeHandleTooltip,
  resizeTooltipPosition,
  transformWebsiteNode,
} from "../../utils/websiteBuilder";
import styles from "./AdminWebsiteBuilder.module.css";

const SPAWN_OPTIONS = [
  { type: "center", label: "Add New Center Content Box" },
  { type: "testimonials", label: "Insert Mock Testimonial Section" },
];
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function RichTextModal({ initialHtml, onClose, onSave, onChange }) {
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const [html, setHtml] = useState(initialHtml || "");

  useEffect(() => {
    const editor = editorRef.current;
    const safeHtml = sanitizeRichText(initialHtml || "", { allowAlignment: true });
    if (editor && editor.innerHTML !== safeHtml) editor.innerHTML = safeHtml;
  }, [initialHtml]);

  function saveSelection() {
    const selection = window.getSelection();
    if (!editorRef.current || !selection?.rangeCount || !editorRef.current.contains(selection.anchorNode)) return;
    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function format(command, value) {
    const editor = editorRef.current;
    editor?.focus();
    const selection = window.getSelection();
    if (editor && selection && savedSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
    document.execCommand(command, false, value || null);
    const nextHtml = editor?.innerHTML || "";
    setHtml(nextHtml);
    onChange(nextHtml);
    saveSelection();
  }

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.editorModal} role="dialog" aria-modal="true" aria-labelledby="builder-editor-title">
        <header className={styles.modalHeader}>
          <div>
            <h2 id="builder-editor-title">Edit content block</h2>
            <p>Format the copy; the saved HTML is sanitized before it is stored.</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close editor"><X /></button>
        </header>
        <div className={styles.toolbar} aria-label="Text formatting">
          <button type="button" title="Bold" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")}><Bold /></button>
          <button type="button" title="Italic" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")}><Italic /></button>
          <button type="button" title="Bulleted list" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertUnorderedList")}><List /></button>
          <button type="button" title="Numbered list" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertOrderedList")}><ListOrdered /></button>
          <button type="button" title="Align left" aria-label="Align left" onMouseDown={(event) => event.preventDefault()} onClick={() => format("justifyLeft")}><AlignLeft /></button>
          <button type="button" title="Align center" aria-label="Align center" onMouseDown={(event) => event.preventDefault()} onClick={() => format("justifyCenter")}><AlignCenter /></button>
          <button type="button" title="Align right" aria-label="Align right" onMouseDown={(event) => event.preventDefault()} onClick={() => format("justifyRight")}><AlignRight /></button>
          <label className={styles.colorTool}>Font color <input type="color" aria-label="Font color" onChange={(event) => format("foreColor", event.target.value)} /></label>
        </div>
        <div
          ref={editorRef}
          className={styles.richEditor}
          role="textbox"
          aria-label="Content block HTML editor"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => {
            const nextHtml = event.currentTarget.innerHTML;
            setHtml(nextHtml);
            onChange(nextHtml);
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          }}
        />
        <footer className={styles.modalActions}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => onSave(sanitizeRichText(html, { allowAlignment: true }))}>Save content</button>
        </footer>
      </section>
    </div>
  );
}

export default function AdminWebsiteBuilder() {
  const { user } = useAuth();
  const toast = useToast();
  const canvasRef = useRef(null);
  const transformRef = useRef(null);
  const resizeTooltipRef = useRef(null);
  const hoverTooltipTimerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_WEBSITE_CANVAS_SIZE);
  const [testimonials, setTestimonials] = useState(MOCK_ACTIVE_TESTIMONIALS.map((item) => ({ ...item })));
  const [pendingTestimonials, setPendingTestimonials] = useState(MOCK_PENDING_TESTIMONIALS.map((item) => ({ ...item })));
  const [websiteQueries, setWebsiteQueries] = useState([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [queriesError, setQueriesError] = useState("");
  const [queriesAttempt, setQueriesAttempt] = useState(0);
  const [savedDraft, setSavedDraft] = useState(null);
  const [versionHistory, setVersionHistory] = useState({ versions: [], activeVersionId: null });
  const [menu, setMenu] = useState(null);
  const [activeEditor, setActiveEditor] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState("design");
  const [uploadingBannerId, setUploadingBannerId] = useState(null);
  const [showGuides, setShowGuides] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishedAt, setPublishedAt] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    websiteApi.getBuilderState(user?.schoolId).then((state) => {
      if (!active) return;
      const draft = state.draft;
      setNodes(normalizeWebsiteBuilderNodes(draft?.nodes || createDefaultWebsiteNodes()));
      setCanvasSize(normalizeWebsiteCanvasSize(draft?.canvas_size));
      setTestimonials(draft?.testimonials || MOCK_ACTIVE_TESTIMONIALS.map((item) => ({ ...item })));
      setPendingTestimonials(draft?.pending_testimonials || MOCK_PENDING_TESTIMONIALS.map((item) => ({ ...item })));
      setSavedDraft(draft ? {
        schoolName: draft.school_name,
        savedAt: state.updated_at,
        canvasSize: draft.canvas_size,
        nodes: draft.nodes,
        testimonials: draft.testimonials,
        pendingTestimonials: draft.pending_testimonials,
      } : null);
      setPublishedAt(state.published_at);
      let nextHistory = { versions: [], activeVersionId: null };
      let historyError = "";
      try {
        const history = readWebsiteVersionHistory(window.localStorage, user?.schoolId);
        nextHistory = !history.versions.length && state.published
          ? addWebsiteVersion(history, state.published, state.published_at || new Date().toISOString())
          : history;
        if (nextHistory !== history) {
          writeWebsiteVersionHistory(window.localStorage, user?.schoolId, nextHistory);
        }
      } catch (error) {
        historyError = apiErrorMessage(error);
        if (state.published) {
          nextHistory = addWebsiteVersion(nextHistory, state.published, state.published_at || new Date().toISOString());
        }
      }
      setVersionHistory(nextHistory);
      setDirty(!draft);
      setStorageError(historyError);
    }).catch((error) => {
      if (!active) return;
      setStorageError(apiErrorMessage(error));
      setNodes([]);
      setSavedDraft(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user?.schoolId, loadAttempt]);

  useEffect(() => {
    if (viewMode !== "queries") return undefined;
    let active = true;
    setWebsiteQueries([]);
    setQueriesLoading(true);
    setQueriesError("");
    websiteApi.getWebsiteQueries().then((queries) => {
      if (active) setWebsiteQueries(queries);
    }).catch((error) => {
      if (active) setQueriesError(apiErrorMessage(error));
    }).finally(() => {
      if (active) setQueriesLoading(false);
    });
    return () => { active = false; };
  }, [viewMode, user?.schoolId, queriesAttempt]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [menu]);

  useEffect(() => {
    function hideTooltip() {
      const tooltip = resizeTooltipRef.current;
      if (!tooltip) return;
      tooltip.dataset.visible = "false";
      tooltip.setAttribute("aria-hidden", "true");
    }
    function placeTooltip(text, mode, clientX, clientY, bounds) {
      const tooltip = resizeTooltipRef.current;
      if (!tooltip) return;
      const position = resizeTooltipPosition(mode, clientX, clientY, bounds, window.innerWidth, window.innerHeight);
      tooltip.textContent = text;
      tooltip.style.left = `${position.left}px`;
      tooltip.style.top = `${position.top}px`;
      tooltip.dataset.visible = "true";
      tooltip.setAttribute("aria-hidden", "false");
    }
    function clearHoverTimer() {
      if (hoverTooltipTimerRef.current) {
        window.clearTimeout(hoverTooltipTimerRef.current);
        hoverTooltipTimerRef.current = null;
      }
    }
    function moveTransform(event) {
      const start = transformRef.current;
      if (!start || event.pointerId !== start.pointerId) return;
      const dx = ((event.clientX - start.clientX) / start.canvasWidth) * 100;
      const dy = ((event.clientY - start.clientY) / start.canvasHeight) * 100;
      const next = transformWebsiteNode(start, start.mode, dx, dy);
      setNodes((current) => current.map((node) => node.id === start.id ? { ...node, ...next } : node));
      setDirty(true);
      if (start.mode === "move") setShowGuides(true);
      placeTooltip(
        resizeDimensionsTooltip(
          (next.width / 100) * start.canvasWidth,
          (next.height / 100) * start.canvasHeight
        ),
        start.mode,
        event.clientX,
        event.clientY,
        start.nodeBounds
      );
    }
    function finishTransform(event) {
      if (!transformRef.current || event.pointerId !== transformRef.current.pointerId) return;
      transformRef.current = null;
      setShowGuides(false);
      hideTooltip();
    }
    function cancelTransform() {
      transformRef.current = null;
      setShowGuides(false);
      hideTooltip();
    }
    window.addEventListener("pointermove", moveTransform);
    window.addEventListener("pointerup", finishTransform);
    window.addEventListener("pointercancel", cancelTransform);
    return () => {
      clearHoverTimer();
      window.removeEventListener("pointermove", moveTransform);
      window.removeEventListener("pointerup", finishTransform);
      window.removeEventListener("pointercancel", cancelTransform);
    };
  }, []);

  function updateNode(id, update) {
    setNodes((current) => current.map((node) => node.id === id
      ? { ...node, ...(typeof update === "function" ? update(node) : update) }
      : node));
    setDirty(true);
  }

  function updateCanvasDimension(dimension, value) {
    if (value === "") return;
    const nextSize = normalizeWebsiteCanvasSize({
      ...canvasSize,
      [dimension]: Number(value),
    });
    setCanvasSize(nextSize);
    setDirty(true);
  }

  function loadSampleSchoolSite() {
    if (!window.confirm("Load the Sunrise School sample site? This replaces the current editor contents. Save your current layout first if you want to keep it.")) return;
    setNodes(createDefaultWebsiteNodes());
    setCanvasSize(DEFAULT_WEBSITE_CANVAS_SIZE);
    setTestimonials(MOCK_ACTIVE_TESTIMONIALS.map((item) => ({ ...item })));
    setPendingTestimonials(MOCK_PENDING_TESTIMONIALS.map((item) => ({ ...item })));
    setDirty(true);
    setStorageError("");
    setViewMode("design");
    toast("Sample school site loaded. Save draft to keep it in this browser.");
  }

  function openContextMenu(event) {
    event.preventDefault();
    const bounds = canvasRef.current.getBoundingClientRect();
    const target = event.target.closest("[data-builder-node]");
    const targetType = target?.dataset.nodeType;
    setMenu({
      x: Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 210)),
      y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 220)),
      nodeId: targetType === "header" || targetType === "footer" ? target.dataset.nodeId : null,
      nodeType: targetType,
    });
  }

  function spawn(type) {
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(82, (menu.x / bounds.width) * 100));
    const y = Math.max(0, Math.min(82, (menu.y / bounds.height) * 100));
    const title = type === "center" ? "New content block" : "Families say it best";
    const node = {
      id: makeId(),
      anchorId: `section-${makeId().slice(0, 8)}`,
      type,
      title,
      x,
      y,
      width: type === "testimonials" ? 90 : 38,
      height: type === "testimonials" ? 16 : 20,
      html: type === "center" ? "<h2>Your new section</h2><p>Click to edit this content and make it your own.</p>" : "",
      labels: [],
    };
    setNodes((current) => [...current, node]);
    if (type === "testimonials") {
      setTestimonials((current) => current.length ? current : MOCK_ACTIVE_TESTIMONIALS.map((item) => ({ ...item })));
    }
    setDirty(true);
    setMenu(null);
  }

  function addLabel(nodeId) {
    const targetId = nodeId || nodes.find((node) => node.type === "header")?.id;
    if (!targetId) return;
    updateNode(targetId, (node) => ({
      labels: [...node.labels, { id: makeId(), text: "", anchorId: "", editing: true }],
    }));
    setMenu(null);
  }

  async function uploadBannerImage(event, nodeId) {
    event.preventDefault();
    const imageFile = Array.from(event.dataTransfer?.files || [])
      .find((file) => file.type.startsWith("image/"));
    if (!imageFile) return;
    setUploadingBannerId(nodeId);
    try {
      const asset = await websiteApi.uploadBuilderAsset(imageFile);
      updateNode(nodeId, (node) => ({
        slides: node.slides?.length
          ? node.slides.map((slide, index) => index === 0 ? { ...slide, imageUrl: resolveMediaUrl(asset.url) } : slide)
          : [{ id: makeId(), imageUrl: resolveMediaUrl(asset.url), title: "A bright beginning for every learner", subtitle: "Curiosity, confidence and community—every day." }],
      }));
      toast("Banner image uploaded");
    } catch (error) {
      toast(apiErrorMessage(error));
    } finally {
      setUploadingBannerId(null);
    }
  }

  function approveTestimonial(id) {
    const result = approveQueuedTestimonial(pendingTestimonials, testimonials, id);
    if (result.pending === pendingTestimonials) return;
    setPendingTestimonials(result.pending);
    setTestimonials(result.live);
    setDirty(true);
  }

  function beginTransform(event, node, mode) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (hoverTooltipTimerRef.current) {
      window.clearTimeout(hoverTooltipTimerRef.current);
      hoverTooltipTimerRef.current = null;
    }
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const nodeBounds = event.currentTarget.closest("[data-builder-node]").getBoundingClientRect();
    transformRef.current = {
      id: node.id,
      mode,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
      nodeBounds,
    };
  }

  function showResizeHint(event, mode) {
    if (transformRef.current) return;
    if (hoverTooltipTimerRef.current) window.clearTimeout(hoverTooltipTimerRef.current);
    const bounds = event.currentTarget.closest("[data-builder-node]").getBoundingClientRect();
    const { clientX, clientY } = event;
    hoverTooltipTimerRef.current = window.setTimeout(() => {
      hoverTooltipTimerRef.current = null;
      const tooltip = resizeTooltipRef.current;
      if (!tooltip || transformRef.current) return;
      const position = resizeTooltipPosition(mode, clientX, clientY, bounds, window.innerWidth, window.innerHeight);
      tooltip.textContent = resizeHandleTooltip(mode);
      tooltip.style.left = `${position.left}px`;
      tooltip.style.top = `${position.top}px`;
      tooltip.dataset.visible = "true";
      tooltip.setAttribute("aria-hidden", "false");
    }, 400);
  }

  function hideResizeHint() {
    if (hoverTooltipTimerRef.current) {
      window.clearTimeout(hoverTooltipTimerRef.current);
      hoverTooltipTimerRef.current = null;
    }
    if (!transformRef.current && resizeTooltipRef.current) {
      resizeTooltipRef.current.dataset.visible = "false";
      resizeTooltipRef.current.setAttribute("aria-hidden", "true");
    }
  }

  function finishTransform(event) {
    if (!transformRef.current || event.pointerId !== transformRef.current.pointerId) return;
    transformRef.current = null;
    const tooltip = resizeTooltipRef.current;
    if (tooltip) {
      tooltip.dataset.visible = "false";
      tooltip.setAttribute("aria-hidden", "true");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const safeNodes = normalizeWebsiteBuilderNodes(nodes).map((node) => ({
        ...node,
        html: sanitizeRichText(node.html, { allowAlignment: true }),
        labels: node.labels.filter((label) => label.text.trim()).map((label) => ({ ...label, editing: false })),
      }));
      const content = {
        school_name: user?.schoolName || "School website",
        canvas_size: canvasSize,
        nodes: safeNodes,
        testimonials,
        pending_testimonials: pendingTestimonials,
      };
      const result = await websiteApi.saveBuilderDraft(content);
      writeLocalWebsiteDraft(window.localStorage, user?.schoolId, content);
      setNodes(safeNodes);
      setSavedDraft({
        schoolName: content.school_name,
        savedAt: result.updated_at,
        canvasSize,
        nodes: safeNodes,
        testimonials,
        pendingTestimonials,
      });
      setPublishedAt(result.published_at);
      setDirty(false);
      setStorageError("");
      toast("Website draft saved");
    } catch (error) {
      const message = apiErrorMessage(error);
      setStorageError(message);
      toast(message);
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      const content = {
        school_name: savedDraft.schoolName || user?.schoolName || "School website",
        canvas_size: savedDraft.canvasSize,
        nodes: savedDraft.nodes,
        testimonials: savedDraft.testimonials || testimonials,
        pending_testimonials: savedDraft.pendingTestimonials || pendingTestimonials,
      };
      const draft = await websiteApi.saveBuilderDraft(content);
      const publishableDraft = {
        schoolName: content.school_name,
        savedAt: draft.updated_at,
        canvasSize: content.canvas_size,
        nodes: content.nodes,
        testimonials: content.testimonials,
        pendingTestimonials: content.pending_testimonials,
      };
      setSavedDraft(publishableDraft);
      setDirty(false);
      setStorageError("");
      try {
        writeLocalWebsiteDraft(window.localStorage, user?.schoolId, content);
      } catch (error) {
        setStorageError(`Draft saved to the server but could not be cached locally: ${apiErrorMessage(error)}`);
      }

      const site = await websiteApi.publishBuilderSite();
      setPublishedAt(site.published_at);
      const nextHistory = addWebsiteVersion(versionHistory, content, site.published_at || new Date().toISOString());
      setVersionHistory(nextHistory);
      try {
        writeWebsiteVersionHistory(window.localStorage, user?.schoolId, nextHistory);
        toast("Website published");
      } catch (error) {
        const message = apiErrorMessage(error);
        setStorageError(message);
        toast(`Website published, but version history could not be saved locally: ${message}`);
      }
    } catch (error) {
      toast(apiErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  }

  function previewWebsiteVersion(version) {
    const content = version.content;
    setPreviewDraft({
      schoolName: content.school_name || content.schoolName || "School website",
      canvasSize: content.canvas_size || content.canvasSize,
      nodes: content.nodes,
      testimonials: content.testimonials || [],
    });
    setShowHistory(false);
    setShowPreview(true);
  }

  function previewSavedWebsite() {
    setPreviewDraft(null);
    setShowPreview(true);
  }

  function restoreWebsiteVersion(version) {
    const content = restoreWebsiteVersionContent(version);
    const restoredNodes = normalizeWebsiteBuilderNodes(content.nodes);
    const restoredCanvasSize = normalizeWebsiteCanvasSize(content.canvas_size || content.canvasSize);
    setNodes(restoredNodes);
    setCanvasSize(restoredCanvasSize);
    setTestimonials(content.testimonials || []);
    setPendingTestimonials(content.pending_testimonials || content.pendingTestimonials || []);
    setDirty(true);
    setShowHistory(false);
    try {
      writeLocalWebsiteDraft(window.localStorage, user?.schoolId, content);
      setStorageError("");
      toast(`Version ${version.number} restored to the canvas. Save and publish to make it live.`);
    } catch (error) {
      const message = apiErrorMessage(error);
      setStorageError(message);
      toast(`Version ${version.number} restored in this session, but could not be saved locally: ${message}`);
    }
  }

  if (loading) {
    return <AdminShell><div className="card white">Loading website builder…</div></AdminShell>;
  }

  if (storageError && !nodes.length) {
    return (
      <AdminShell>
        <div className="card white" role="alert">
          <p>Could not load the website builder: {storageError}</p>
          <button type="button" className="btn primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <div className="scr-title">Build Your Site</div>
            <div className="scr-sub">Design and preview your one-page school website.</div>
          </div>
          <div className={styles.headerActions}>
            <button className="btn ghost" type="button" onClick={loadSampleSchoolSite}>
              <Sparkles size={16} aria-hidden="true" /> Load sample school site
            </button>
            <button className="btn ghost" type="button" onClick={previewSavedWebsite} disabled={!savedDraft}>
              Preview saved website
            </button>
            <button className="btn ghost" type="button" onClick={() => setShowHistory(true)}>
              <History size={16} aria-hidden="true" /> History
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={saving || !dirty}>
              <Save size={17} aria-hidden="true" /> {saving ? "Saving..." : "Save draft"}
            </button>
          </div>
        </header>
        <div className={styles.prototypeNotice} role="status">
          <strong>Website builder</strong>
          <span>Drafts and published versions are saved to your school website. Save changes before publishing.</span>
          {savedDraft?.savedAt ? <span className={styles.savedTimestamp}>Last saved {new Date(savedDraft.savedAt).toLocaleString()}</span> : null}
          {publishedAt ? <a className={styles.savedTimestamp} href={publicSitePath(savedDraft?.schoolName || user?.schoolName)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> View live website</a> : null}
        </div>
        {storageError ? <div className={styles.storageError} role="alert">{storageError}</div> : null}
        <div className={styles.modeTabs} role="tablist" aria-label="Website builder views">
          <button type="button" role="tab" aria-selected={viewMode === "design"} className={viewMode === "design" ? styles.activeTab : ""} onClick={() => setViewMode("design")}>
            <ImageIcon size={16} /> Website designer
          </button>
          <button type="button" role="tab" aria-selected={viewMode === "moderation"} className={viewMode === "moderation" ? styles.activeTab : ""} onClick={() => setViewMode("moderation")}>
            <MessageSquareText size={16} /> Testimonial approvals <span>{pendingTestimonials.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={viewMode === "queries"} className={viewMode === "queries" ? styles.activeTab : ""} onClick={() => setViewMode("queries")}>
            <Inbox size={16} /> User queries <span>{websiteQueries.length}</span>
          </button>
        </div>
        {viewMode === "queries" ? (
          <section className={styles.queriesPanel} aria-label="User queries">
            <header>
              <div><h2>Contact form submissions</h2><p>Messages submitted through your published school website.</p></div>
              <button type="button" className="btn ghost sm" onClick={() => setQueriesAttempt((attempt) => attempt + 1)}>Refresh queries</button>
            </header>
            {queriesLoading ? <p className={styles.queryState} role="status">Loading user queries…</p> : null}
            {queriesError ? <p className={styles.queryError} role="alert">{queriesError}</p> : null}
            {!queriesLoading && !queriesError && websiteQueries.length === 0 ? (
              <p className={styles.emptyQueue}>No contact form submissions yet.</p>
            ) : null}
            {!queriesLoading && websiteQueries.length > 0 ? (
              <div className={styles.queryList}>
                {websiteQueries.map((query) => (
                  <article className={styles.queryCard} key={query.query_id}>
                    <header>
                      <div><h3>{query.name}</h3><a href={`mailto:${query.email}`}>{query.email}</a></div>
                      <time dateTime={query.created_at}>{new Date(query.created_at).toLocaleString()}</time>
                    </header>
                    <p>{query.message}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : viewMode === "moderation" ? (
          <section className={styles.moderationPanel} aria-label="Testimonial approvals">
            <header><div><h2>Pending testimonials</h2><p>Approve a story to add it to the live website preview.</p></div><span>{pendingTestimonials.length} pending</span></header>
            {pendingTestimonials.length ? (
              <div className={styles.pendingGrid}>
                {pendingTestimonials.map((item) => (
                  <article className={styles.pendingCard} key={item.id}>
                    <span className={styles.pendingBadge}>Pending approval</span>
                    <blockquote>“{item.quote}”</blockquote>
                    <strong>{item.name}</strong><small>{item.role}</small>
                    <button type="button" className="btn primary sm" onClick={() => approveTestimonial(item.id)}><Check size={15} /> Approve</button>
                  </article>
                ))}
              </div>
            ) : <p className={styles.emptyQueue}>All caught up. Approved stories appear in the saved website preview after saving.</p>}
          </section>
        ) : (
        <>
        <div className={styles.instructions}>
          <strong>Canvas builder</strong>
          <span>Right-click the canvas or header/footer for actions. Drag the banner image here to simulate replacing it. Drag and resize sections; click a content box to edit.</span>
          <span className={styles.saveState} aria-live="polite">{dirty ? "Unsaved changes" : savedDraft ? "Saved to your school website" : "Not saved yet"}</span>
        </div>
        <div className={styles.canvasControls}>
          <strong>Canvas size</strong>
          <label>
            Width
            <input
              type="number"
              min={WEBSITE_CANVAS_LIMITS.minWidth}
              max={WEBSITE_CANVAS_LIMITS.maxWidth}
              step="50"
              value={canvasSize.width}
              onChange={(event) => updateCanvasDimension("width", event.target.value)}
              aria-label="Canvas width in pixels"
            />
            <span>px</span>
          </label>
          <label>
            Height
            <input
              type="number"
              min={WEBSITE_CANVAS_LIMITS.minHeight}
              max={WEBSITE_CANVAS_LIMITS.maxHeight}
              step="50"
              value={canvasSize.height}
              onChange={(event) => updateCanvasDimension("height", event.target.value)}
              aria-label="Canvas height in pixels"
            />
            <span>px</span>
          </label>
          <span className={styles.canvasSizeHint}>Custom dimensions apply to the design canvas and are saved with your draft.</span>
        </div>
        <div className={styles.canvasViewport}>
          <div
            ref={canvasRef}
            className={styles.canvas}
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
            onContextMenu={openContextMenu}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setMenu(null);
            }}
            aria-label="Website layout canvas"
          >
            {nodes.map((node) => (
              <section
                key={node.id}
                id={node.anchorId || `builder-${node.id}`}
                data-builder-node
                data-node-id={node.id}
                data-node-type={node.type}
                className={`${styles.node} ${styles[node.type] || ""}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: `${node.width}%`,
                  height: `${node.height}%`,
                }}
                onClick={(event) => {
                  if (node.type === "center" && !event.target.closest("input, button, a")) {
                    setActiveEditor(node.id);
                  }
                }}
                onDragOver={node.type === "banner" ? (event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                } : undefined}
                onDrop={node.type === "banner" ? (event) => uploadBannerImage(event, node.id) : undefined}
                aria-label={`${node.title} canvas section`}
              >
                <div className={styles.nodeToolbar} onPointerDown={(event) => beginTransform(event, node, "move")}>
                  <span>{node.title}</span>
                  <button type="button" className={styles.deleteButton} title={`Remove ${node.title}`} aria-label={`Remove ${node.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                    event.stopPropagation();
                    setNodes((current) => current.filter((item) => item.id !== node.id));
                    setDirty(true);
                  }}><Trash2 size={14} /></button>
                </div>
                <label className={styles.anchorField}>
                  Anchor ID
                  <input
                    value={node.anchorId || ""}
                    aria-label={`${node.title} anchor ID`}
                    placeholder="section-id"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => updateNode(node.id, {
                      anchorId: event.target.value.replace(/[^a-zA-Z0-9_-]/g, ""),
                    })}
                  />
                </label>
                {node.type === "header" || node.type === "footer" ? (
                  <div className={styles.labels}>
                    {node.labels.map((label) => (
                      <div className={styles.labelItem} key={label.id}>
                        <input aria-label="Navigation label" placeholder="Label (e.g. Services)" value={label.text} onChange={(event) => updateNode(node.id, (current) => ({
                          labels: current.labels.map((item) => item.id === label.id ? { ...item, text: event.target.value } : item),
                        }))} onPointerDown={(event) => event.stopPropagation()} />
                        <input aria-label="Anchor coordinate ID" placeholder="Anchor ID (e.g. services)" value={label.anchorId} onChange={(event) => updateNode(node.id, (current) => ({
                          labels: current.labels.map((item) => item.id === label.id ? { ...item, anchorId: event.target.value.replace(/[^a-zA-Z0-9_-]/g, "") } : item),
                        }))} onPointerDown={(event) => event.stopPropagation()} />
                        <button type="button" aria-label="Remove label" onClick={() => updateNode(node.id, (current) => ({
                          labels: current.labels.filter((item) => item.id !== label.id),
                        }))}><X size={13} /></button>
                      </div>
                    ))}
                    {!node.labels.length ? <span className={styles.emptyHint}>Right-click to add navigation labels</span> : null}
                  </div>
                ) : node.type === "banner" ? (
                  <div className={styles.bannerEditor}>
                    <img src={node.slides?.[0]?.imageUrl} alt="Mock school banner preview" />
                    <div><strong>{node.slides?.[0]?.title}</strong><span>Drop an image file here to upload it to your school website</span></div>
                    {uploadingBannerId === node.id ? <div className={styles.bannerLoader}><span className={styles.spinner} />Uploading media layout asset...</div> : null}
                  </div>
                ) : node.type === "testimonials" ? (
                  <div className={styles.nodeContent}>
                    <strong>{node.title}</strong>
                    <div className={styles.editorTestimonialList}>
                      {testimonials.map((item) => <blockquote key={item.id}><span>“{item.quote}”</span><small>{item.name} · {item.role}</small></blockquote>)}
                    </div>
                  </div>
                ) : node.type === "contact" ? (
                  <div className={styles.nodeContent}>
                    <strong>{node.title}</strong>
                    <span>Contact form simulation appears in the saved website preview.</span>
                  </div>
                ) : node.type === "testimonial" ? (
                  <div className={styles.nodeContent}>
                    <strong>Testimonial section</strong>
                    <span>Approved family stories appear in the public preview.</span>
                  </div>
                ) : (
                  <div className={styles.nodeContent}>
                    {node.html
                      ? <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(node.html, { allowAlignment: true }) }} />
                      : <span>Click to edit this content block</span>}
                  </div>
                )}
                {HANDLES.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={`${styles.resizeHandle} ${styles[resizeHandleClassName(handle)]}`}
                    aria-label={`${resizeHandleTooltip(handle)} ${node.title}`}
                    aria-describedby="website-resize-tooltip"
                    onPointerEnter={(event) => showResizeHint(event, handle)}
                    onPointerLeave={hideResizeHint}
                    onPointerDown={(event) => beginTransform(event, node, handle)}
                    onPointerUp={finishTransform}
                    onLostPointerCapture={finishTransform}
                  />
                ))}
              </section>
            ))}
            {showGuides ? <div className={styles.guides} aria-hidden="true"><span /><span /></div> : null}
            {menu ? (
              <div
                className={styles.contextMenu}
                style={{ left: menu.x, top: menu.y }}
                role="menu"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button type="button" role="menuitem" onClick={() => addLabel(menu.nodeId)}>
                  {menu.nodeType === "footer" ? "Add Footer Navigation Label" : "Add Header Navigation Label"}
                </button>
                {SPAWN_OPTIONS.map((option) => (
                  <button type="button" role="menuitem" key={option.type} onClick={() => spawn(option.type)}>{option.label}</button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <p className={styles.canvasNote}>Tip: section positions and sizes are responsive percentages, so the published layout adapts to different screen widths.</p>
        <div ref={resizeTooltipRef} id="website-resize-tooltip" className={styles.resizeTooltip} role="tooltip" aria-hidden="true" data-visible="false" />
        </>
        )}
      </div>
      {showHistory ? (
        <div className={styles.historyBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowHistory(false);
        }}>
          <aside className={styles.historyDrawer} role="dialog" aria-modal="true" aria-labelledby="website-history-title">
            <header>
              <div><h2 id="website-history-title">Website Version History</h2><p>Preview or restore an archived deployment.</p></div>
              <button type="button" className={styles.iconButton} onClick={() => setShowHistory(false)} aria-label="Close version history"><X /></button>
            </header>
            {versionHistory.versions.length ? (
              <div className={styles.versionList}>
                {versionHistory.versions.map((version) => {
                  const activeVersion = version.id === versionHistory.activeVersionId;
                  return (
                    <article className={styles.versionCard} key={version.id}>
                      <strong>Version {version.number}{activeVersion ? " (Active)" : ""}</strong>
                      <time dateTime={version.deployedAt}>
                        Deployed on {new Date(version.deployedAt).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit", hour12: true,
                        })}
                      </time>
                      <div>
                        <button type="button" className="btn ghost sm" onClick={() => previewWebsiteVersion(version)}>Preview Version</button>
                        <button type="button" className={styles.restoreButton} onClick={() => restoreWebsiteVersion(version)}>Restore This Version</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyHistory}>No deployments yet. Publish a saved website to start version history.</p>
            )}
          </aside>
        </div>
      ) : null}
      {activeEditor ? (
        <RichTextModal
          initialHtml={nodes.find((node) => node.id === activeEditor)?.html || ""}
          onClose={() => setActiveEditor(null)}
          onSave={(html) => {
            updateNode(activeEditor, { html });
            setActiveEditor(null);
          }}
          onChange={(html) => updateNode(activeEditor, { html })}
        />
      ) : null}
      {showPreview && savedDraft ? (
        <div className={styles.previewBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowPreview(false);
        }}>
          <section className={styles.previewDialog} role="dialog" aria-modal="true" aria-labelledby="website-preview-title">
            <header className={styles.previewToolbar}>
              <div>
                  <h2 id="website-preview-title">{previewDraft ? "Website version preview" : "Saved website preview"}</h2>
                  <p>{previewDraft ? "Previewing an archived website version." : "This is the latest saved draft. Publish it to make it publicly available."}</p>
              </div>
              <div className={styles.previewActions}>
                <button
                  className="btn primary"
                  type="button"
                  onClick={publish}
                  disabled={publishing || !savedDraft || dirty || Boolean(previewDraft)}
                >
                  {publishing ? "Publishing..." : "Publish website"}
                </button>
                <button type="button" className={styles.iconButton} onClick={() => {
                  setShowPreview(false);
                  setPreviewDraft(null);
                }} aria-label="Close preview"><X /></button>
              </div>
            </header>
            <div className={styles.previewFrame}>
              <header className={styles.previewBrand}>
                <span className={styles.previewLogo} aria-hidden="true">{(savedDraft.schoolName || user?.schoolName || "S").slice(0, 1).toUpperCase()}</span>
                <strong>{savedDraft.schoolName || user?.schoolName || "School website"}</strong>
              </header>
              <PublicSiteCanvas
                nodes={(previewDraft || savedDraft).nodes}
                canvasSize={(previewDraft || savedDraft).canvasSize}
                testimonials={(previewDraft || savedDraft).testimonials}
                schoolName={(previewDraft || savedDraft).schoolName}
              />
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
