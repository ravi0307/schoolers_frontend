const ALLOWED_RICH_TEXT_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "BR", "P", "FONT", "IMG"]);
export const FONT_SIZE_OPTIONS = [
  { value: "1", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "5", label: "Large" },
  { value: "7", label: "Huge" },
];

export function sanitizeRichText(value) {
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

export function richTextToPlainText(value) {
  if (typeof document === "undefined") return String(value || "").replace(/<[^>]*>/g, " ");
  const container = document.createElement("div");
  container.innerHTML = value || "";
  return container.textContent || "";
}