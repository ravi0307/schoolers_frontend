import { useEffect, useRef, useState } from "react";
import { FONT_SIZE_OPTIONS, sanitizeRichText } from "./richText";

export default function RichTextEditor({ value, onChange, minHeight = 150 }) {
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
        style={{ minHeight, padding: "10px 12px", outline: "none", fontSize: 13.5, lineHeight: 1.5, overflowWrap: "anywhere" }}
      >
        {null}
      </div>
    </div>
  );
}