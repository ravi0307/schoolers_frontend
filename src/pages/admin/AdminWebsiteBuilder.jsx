import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Save,
  Trash2,
  X,
} from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as websiteApi from "../../api/website";
import { Spinner } from "../../components/ui/Primitives";
import { useToast } from "../../context/ToastContext";
import { apiErrorMessage } from "../../api/client";
import { sanitizeRichText } from "../../components/ui/richText";
import {
  createDefaultWebsiteNodes,
  normalizeWebsiteBuilderNodes,
  parseWebsiteBuilderContent,
  serializeWebsiteBuilderContent,
  transformWebsiteNode,
} from "../../utils/websiteBuilder";
import styles from "./AdminWebsiteBuilder.module.css";

const SPAWN_OPTIONS = [
  { type: "header", label: "Header" },
  { type: "footer", label: "Footer" },
  { type: "testimonial", label: "Testimonial Section" },
  { type: "center", label: "Center Content Box" },
];
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function RichTextModal({ initialHtml, onClose, onSave }) {
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const [html, setHtml] = useState(initialHtml || "");

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeRichText(initialHtml || "", { allowAlignment: true });
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
    setHtml(editor?.innerHTML || "");
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
          onInput={(event) => setHtml(event.currentTarget.innerHTML)}
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
  const { data, loading, error, refetch } = useApi(
    () => Promise.all([
      websiteApi.getPage("home").catch((requestError) => {
        if (requestError?.response?.status === 404) return null;
        throw requestError;
      }),
      websiteApi.getSettings().catch((requestError) => {
        if (requestError?.response?.status === 404) return null;
        throw requestError;
      }),
    ]).then(([homePage, settings]) => ({ homePage, settings })),
    []
  );
  const toast = useToast();
  const canvasRef = useRef(null);
  const transformRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [menu, setMenu] = useState(null);
  const [activeEditor, setActiveEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    const stored = parseWebsiteBuilderContent(data.homePage?.body);
    setNodes(normalizeWebsiteBuilderNodes(
      stored?.nodes || createDefaultWebsiteNodes(data.homePage || {})
    ));
  }, [data]);

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
    function moveTransform(event) {
      const start = transformRef.current;
      if (!start || event.pointerId !== start.pointerId) return;
      const dx = ((event.clientX - start.clientX) / start.canvasWidth) * 100;
      const dy = ((event.clientY - start.clientY) / start.canvasHeight) * 100;
      const next = transformWebsiteNode(start, start.mode, dx, dy);
      setNodes((current) => current.map((node) => node.id === start.id ? { ...node, ...next } : node));
      setDirty(true);
    }
    function finishTransform(event) {
      if (!transformRef.current || event.pointerId !== transformRef.current.pointerId) return;
      transformRef.current = null;
    }
    window.addEventListener("pointermove", moveTransform);
    window.addEventListener("pointerup", finishTransform);
    window.addEventListener("pointercancel", finishTransform);
    return () => {
      window.removeEventListener("pointermove", moveTransform);
      window.removeEventListener("pointerup", finishTransform);
      window.removeEventListener("pointercancel", finishTransform);
    };
  }, []);

  function updateNode(id, update) {
    setNodes((current) => current.map((node) => node.id === id
      ? { ...node, ...(typeof update === "function" ? update(node) : update) }
      : node));
    setDirty(true);
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
    });
  }

  function spawn(type) {
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(82, (menu.x / bounds.width) * 100));
    const y = Math.max(0, Math.min(82, (menu.y / bounds.height) * 100));
    const title = SPAWN_OPTIONS.find((option) => option.type === type)?.label || "Content";
    const node = {
      id: makeId(),
      anchorId: `section-${makeId().slice(0, 8)}`,
      type,
      title,
      x,
      y,
      width: type === "header" || type === "footer" ? 96 : 38,
      height: type === "header" || type === "footer" ? 14 : 25,
      html: "",
      labels: [],
    };
    setNodes((current) => [...current, node]);
    setDirty(true);
    setMenu(null);
  }

  function addLabel(nodeId) {
    updateNode(nodeId, (node) => ({
      labels: [...node.labels, { id: makeId(), text: "", anchorId: "", editing: true }],
    }));
    setMenu(null);
  }

  function beginTransform(event, node, mode) {
    event.preventDefault();
    event.stopPropagation();
    const canvasBounds = canvasRef.current.getBoundingClientRect();
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
    };
  }

  async function save() {
    setSaving(true);
    try {
      const safeNodes = normalizeWebsiteBuilderNodes(nodes).map((node) => ({
        ...node,
        html: sanitizeRichText(node.html, { allowAlignment: true }),
        labels: node.labels.filter((label) => label.text.trim()).map((label) => ({ ...label, editing: false })),
      }));
      const page = data?.homePage || {};
      await websiteApi.upsertPage("home", {
        banner_url: page.banner_url || "",
        heading: page.heading || data?.settings?.school_name || "Welcome",
        subheading: page.subheading || "",
        body: serializeWebsiteBuilderContent(safeNodes),
      });
      setNodes(safeNodes);
      setDirty(false);
      toast("Website canvas saved");
      refetch();
    } catch (error) {
      toast(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminShell><Spinner /></AdminShell>;
  if (error || !data) {
    return (
      <AdminShell>
        <div className="card white" role="alert">
          <p>{error || "Website builder data could not be loaded."}</p>
          <button className="btn primary sm" type="button" onClick={refetch}>Retry</button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <div className="scr-title">my_website2</div>
            <div className="scr-sub">Arrange sections and content on your school website canvas.</div>
          </div>
          <button className="btn primary" type="button" onClick={save} disabled={saving || !dirty}>
            <Save size={17} aria-hidden="true" /> {saving ? "Saving..." : "Save canvas"}
          </button>
        </header>
        <div className={styles.instructions}>
          <strong>Canvas builder</strong>
          <span>Right-click the canvas to add a section. Right-click a header or footer to add navigation labels. Drag and resize sections; click a content box to edit it.</span>
          <span className={styles.saveState} aria-live="polite">{dirty ? "Unsaved changes" : "All changes saved to your website"}</span>
        </div>
        <div className={styles.canvasViewport}>
          <div
            ref={canvasRef}
            className={styles.canvas}
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
                ) : node.type === "testimonial" ? (
                  <div className={styles.nodeContent}>
                    <strong>Testimonials</strong>
                    <span>Family stories and quotes</span>
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
                    className={`${styles.resizeHandle} ${styles[`handle${handle}`]}`}
                    aria-label={`Resize ${node.title} ${handle}`}
                    onPointerDown={(event) => beginTransform(event, node, handle)}
                  />
                ))}
              </section>
            ))}
            {menu ? (
              <div
                className={styles.contextMenu}
                style={{ left: menu.x, top: menu.y }}
                role="menu"
                onPointerDown={(event) => event.stopPropagation()}
              >
                {menu.nodeId ? (
                  <button type="button" role="menuitem" onClick={() => addLabel(menu.nodeId)}>Add New Label</button>
                ) : SPAWN_OPTIONS.map((option) => (
                  <button type="button" role="menuitem" key={option.type} onClick={() => spawn(option.type)}>{option.label}</button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <p className={styles.canvasNote}>Tip: section positions and sizes are responsive percentages, so the published layout adapts to different screen widths.</p>
      </div>
      {activeEditor ? (
        <RichTextModal
          initialHtml={nodes.find((node) => node.id === activeEditor)?.html || ""}
          onClose={() => setActiveEditor(null)}
          onSave={(html) => {
            updateNode(activeEditor, { html });
            setActiveEditor(null);
          }}
        />
      ) : null}
    </AdminShell>
  );
}
