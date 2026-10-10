export const WEBSITE_BUILDER_PREFIX = "schoolers-canvas:v1:";

export function parseWebsiteBuilderContent(value) {
  if (typeof value !== "string" || !value.startsWith(WEBSITE_BUILDER_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(WEBSITE_BUILDER_PREFIX.length));
    if (!Array.isArray(parsed.nodes)) return null;
    return { nodes: normalizeWebsiteBuilderNodes(parsed.nodes) };
  } catch {
    return null;
  }
}

export function serializeWebsiteBuilderContent(nodes) {
  return `${WEBSITE_BUILDER_PREFIX}${JSON.stringify({ nodes })}`;
}

export function transformWebsiteNode(node, mode, dx, dy) {
  const next = { x: node.x, y: node.y, width: node.width, height: node.height };
  if (mode === "move") {
    next.x = clampNumber(node.x + dx, 0, 100 - node.width, node.x);
    next.y = clampNumber(node.y + dy, 0, 100 - node.height, node.y);
    return next;
  }

  if (mode.includes("e")) {
    next.width = clampNumber(node.width + dx, 12, 100 - node.x, node.width);
  }
  if (mode.includes("w")) {
    const right = node.x + node.width;
    next.x = clampNumber(node.x + dx, 0, right - 12, node.x);
    next.width = right - next.x;
  }
  if (mode.includes("s")) {
    next.height = clampNumber(node.height + dy, 10, 100 - node.y, node.height);
  }
  if (mode.includes("n")) {
    const bottom = node.y + node.height;
    next.y = clampNumber(node.y + dy, 0, bottom - 10, node.y);
    next.height = bottom - next.y;
  }
  return next;
}

export function createDefaultWebsiteNodes(homePage = {}) {
  const nodes = [
    {
      id: "site-header",
      anchorId: "header",
      type: "header",
      title: "Header",
      x: 2,
      y: 3,
      width: 96,
      height: 15,
      labels: [],
      html: "",
    },
    {
      id: "site-footer",
      anchorId: "footer",
      type: "footer",
      title: "Footer",
      x: 2,
      y: 82,
      width: 96,
      height: 15,
      labels: [],
      html: "",
    },
  ];
  if (homePage.body?.trim()) {
    nodes.splice(1, 0, {
      id: "home-content",
      anchorId: "home",
      type: "center",
      title: "Home content",
      x: 14,
      y: 27,
      width: 72,
      height: 35,
      labels: [],
      html: homePage.body,
    });
  }
  return nodes;
}

export function normalizeWebsiteBuilderNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((node) => node && typeof node.id === "string" && typeof node.type === "string")
    .map((node) => {
      const x = clampNumber(node.x, 0, 92, 2);
      const y = clampNumber(node.y, 0, 92, 2);
      return {
        id: node.id.slice(0, 100),
        anchorId: typeof node.anchorId === "string" ? node.anchorId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "",
        type: ["header", "footer", "testimonial", "center"].includes(node.type) ? node.type : "center",
        title: typeof node.title === "string" ? node.title.slice(0, 120) : "Content",
        x,
        y,
        width: clampNumber(node.width, 8, 100 - x, 40),
        height: clampNumber(node.height, 8, 100 - y, 20),
        html: typeof node.html === "string" ? node.html : "",
        labels: Array.isArray(node.labels)
          ? node.labels.filter((label) => label && typeof label.id === "string").map((label) => ({
              id: label.id.slice(0, 100),
              text: typeof label.text === "string" ? label.text.slice(0, 80) : "",
              anchorId: typeof label.anchorId === "string" ? label.anchorId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "",
              editing: !!label.editing,
            }))
          : [],
      };
    });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
