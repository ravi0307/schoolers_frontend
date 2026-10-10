const ALLOWED_RICH_TEXT_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "BR", "P", "H1", "H2", "H3", "BLOCKQUOTE", "FONT", "SPAN", "IMG"]);
export const FONT_FAMILY_OPTIONS = [
  { value: "Arial", label: "Sans-serif" },
  { value: "Georgia", label: "Elegant serif" },
  { value: "monospace", label: "Modern monospace" },
];
export const FONT_SIZE_OPTIONS = [
  { value: "1", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "5", label: "Large" },
  { value: "7", label: "Huge" },
];

export function sanitizeRichText(value, { allowAlignment = false } = {}) {
  if (typeof document === "undefined") return value || "";
  const container = document.createElement("div");
  container.innerHTML = value || "";
  const allowedTags = allowAlignment
    ? new Set([...ALLOWED_RICH_TEXT_TAGS, "DIV", "P"])
    : ALLOWED_RICH_TEXT_TAGS;
  container.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    if (element.tagName === "IMG") {
      const source = element.getAttribute("src") || "";
      if (!isSafeImageSource(source)) {
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
          if (!isSafeColor(color)) {
            element.removeAttribute(attribute.name);
          }
        } else if (attribute.name === "size") {
          if (!/^[1-7]$/.test(attribute.value)) element.removeAttribute(attribute.name);
        } else if (attribute.name === "face") {
          if (!/^(Arial|Georgia|monospace|Inter|sans-serif|serif)$/i.test(attribute.value.trim())) {
            element.removeAttribute(attribute.name);
          }
        } else if (allowAlignment && ["DIV", "P"].includes(element.tagName)) {
          const alignment = (element.getAttribute("style") || "").match(/^text-align\s*:\s*(left|center|right|justify)\s*;?$/i)?.[1];
          Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
          if (alignment) element.setAttribute("style", `text-align: ${alignment.toLowerCase()}`);
        } else {
          element.removeAttribute(attribute.name);
        }
      });
    } else if (element.tagName === "SPAN" || (allowAlignment && ["DIV", "P"].includes(element.tagName))) {
      const safeStyle = sanitizeInlineStyle(element.getAttribute("style") || "", allowAlignment);
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
      if (safeStyle) element.setAttribute("style", safeStyle);
    } else {
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
    }
  });
  return container.innerHTML.trim();
}

function isSafeColor(value) {
  return /^#[0-9a-f]{3,8}$/i.test(value)
    || /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(value)
    || /^hsla?\(\s*[\d.]+(?:deg)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(value);
}

function isSafeImageSource(source) {
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(source)) return true;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(source)) return true;
  return /^\/(?!\/)[^\s"'<>]*$/.test(source);
}

function sanitizeInlineStyle(value, allowAlignment) {
  const declarations = [];
  value.split(";").forEach((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 0) return;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const content = declaration.slice(separator + 1).trim();
    if (property === "color" || property === "background-color") {
      if (isSafeColor(content)) declarations.push(`${property}: ${content}`);
    } else if (property === "font-family") {
      const family = content.replace(/["']/g, "").trim();
      if (/^(Arial|Georgia|monospace|Inter|sans-serif|serif)$/i.test(family)) {
        declarations.push(`${property}: ${family}`);
      }
    } else if (property === "font-size" && /^(?:\d+(?:\.\d+)?)(?:px|pt|em|rem|%)$/i.test(content)) {
      declarations.push(`${property}: ${content}`);
    } else if (allowAlignment && property === "text-align" && /^(left|center|right|justify)$/i.test(content)) {
      declarations.push(`${property}: ${content.toLowerCase()}`);
    }
  });
  return declarations.join("; ");
}

export function richTextToPlainText(value) {
  if (typeof document === "undefined") return String(value || "").replace(/<[^>]*>/g, " ");
  const container = document.createElement("div");
  container.innerHTML = value || "";
  return container.textContent || "";
}