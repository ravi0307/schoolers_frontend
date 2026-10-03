import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { FONT_SIZE_OPTIONS, sanitizeRichText } from "./richText";
import styles from "./RichTextEditor.module.css";

export default function RichTextEditor({ id, value, onChange, minHeight = 150 }) {
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const sanitizedValue = sanitizeRichText(value);
  const [activeFormats, setActiveFormats] = useState({});
  const [defaultTextColor] = useState(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim()
  );
  const contentHeight = minHeight <= 60
    ? styles.contentCompact
    : minHeight <= 80
      ? styles.contentShort
      : minHeight <= 90
        ? styles.contentMedium
        : styles.contentDefault;

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

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <button className={`${styles.toolButton} ${activeFormats.bold ? styles.active : ""}`} aria-pressed={!!activeFormats.bold} title="Bold" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")}><b>B</b></button>
        <button className={`${styles.toolButton} ${activeFormats.italic ? styles.active : ""}`} aria-pressed={!!activeFormats.italic} title="Italic" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")}><i>I</i></button>
        <button className={`${styles.toolButton} ${activeFormats.underline ? styles.active : ""}`} aria-pressed={!!activeFormats.underline} title="Underline" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("underline")}><u>U</u></button>
        <button className={`${styles.toolButton} ${activeFormats.unorderedList ? styles.active : ""}`} aria-pressed={!!activeFormats.unorderedList} title="Bulleted list" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertUnorderedList")}>• List</button>
        <button className={`${styles.toolButton} ${activeFormats.orderedList ? styles.active : ""}`} aria-pressed={!!activeFormats.orderedList} title="Numbered list" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertOrderedList")}>1. List</button>
        <label className={styles.colorControl} onMouseDown={(event) => event.preventDefault()}>
          Color
          <input
            type="color"
            defaultValue={defaultTextColor}
            title="Text color"
            aria-label="Text color"
            onChange={(event) => format("foreColor", event.target.value)}
          />
        </label>
        <select
          className={styles.fontSize}
          aria-label="Font size"
          defaultValue="3"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => format("fontSize", event.target.value)}
        >
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className={styles.toolButton} title="Insert image" type="button" onMouseDown={(event) => event.preventDefault()} onClick={openImagePicker}><ImagePlus aria-hidden="true" /> Image</button>
        <button className={styles.toolButton} title="Clear formatting" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("removeFormat")}>Clear</button>
        <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={insertImage} hidden />
      </div>
      <div
        id={id}
        ref={editorRef}
        className={`${styles.content} ${contentHeight}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
      >
        {null}
      </div>
    </div>
  );
}