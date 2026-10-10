export const DEFAULT_WEBSITE_CANVAS_SIZE = Object.freeze({ width: 1200, height: 1900 });
export const WEBSITE_CANVAS_LIMITS = Object.freeze({
  minWidth: 650,
  maxWidth: 5000,
  minHeight: 560,
  maxHeight: 5000,
});
export const WEBSITE_VERSION_HISTORY_PREFIX = "schoolers-website-version-history:";
export const WEBSITE_DRAFT_PREFIX = "schoolers-website-builder-draft:";
export const MOCK_BANNER_SLIDES = Object.freeze([
  {
    id: "banner-slide-1",
    imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1800&q=85",
    title: "A bright beginning for every learner",
    subtitle: "Curiosity, confidence and community—every day at Sunrise School.",
  },
  {
    id: "banner-slide-2",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=85",
    title: "Learning that opens new possibilities",
    subtitle: "A caring environment where every student can find their spark.",
  },
]);
export const MOCK_ACTIVE_TESTIMONIALS = Object.freeze([
  { id: "live-1", name: "Divya Shah", role: "Parent", quote: "A warm, thoughtful school where our child feels seen and supported." },
  { id: "live-2", name: "Rohan Das", role: "Alumnus", quote: "The teachers helped me discover what I love and gave me the confidence to pursue it." },
]);

export const MOCK_PENDING_TESTIMONIALS = Object.freeze([
  { id: "pending-1", name: "Ananya Rao", role: "Parent of Grade 4 student", quote: "The teachers make learning joyful. Our daughter comes home excited to share what she discovered." },
  { id: "pending-2", name: "Karthik Menon", role: "Parent of Grade 2 student", quote: "We have seen our son become more confident, independent, and curious since joining Sunrise." },
  { id: "pending-3", name: "Meera Iyer", role: "School alumna", quote: "The supportive teachers and friendships I found here still inspire me today." },
]);

export function approveQueuedTestimonial(pending, live, id) {
  const testimonial = pending.find((item) => item.id === id);
  if (!testimonial) return { pending, live };
  return {
    pending: pending.filter((item) => item.id !== id),
    live: [...live, testimonial],
  };
}

export function normalizeWebsiteCanvasSize(size = {}) {
  return {
    width: clampNumber(
      size.width,
      WEBSITE_CANVAS_LIMITS.minWidth,
      WEBSITE_CANVAS_LIMITS.maxWidth,
      DEFAULT_WEBSITE_CANVAS_SIZE.width
    ),
    height: clampNumber(
      size.height,
      WEBSITE_CANVAS_LIMITS.minHeight,
      WEBSITE_CANVAS_LIMITS.maxHeight,
      DEFAULT_WEBSITE_CANVAS_SIZE.height
    ),
  };
}

export function websiteDraftStorageKey(schoolId) {
  return `${WEBSITE_DRAFT_PREFIX}${String(schoolId || "default").replace(/[^a-zA-Z0-9_-]/g, "") || "default"}`;
}

export function websiteVersionHistoryStorageKey(schoolId) {
  return `${WEBSITE_VERSION_HISTORY_PREFIX}${String(schoolId || "default").replace(/[^a-zA-Z0-9_-]/g, "") || "default"}`;
}

export function readLocalWebsiteDraft(storage, schoolId) {
  const raw = storage.getItem(websiteDraftStorageKey(schoolId));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) {
    throw new Error("The local website draft has an unsupported format.");
  }
  return {
    school_name: parsed.school_name || parsed.schoolName || "School website",
    canvas_size: normalizeWebsiteCanvasSize(parsed.canvas_size || parsed.canvasSize),
    nodes: normalizeWebsiteBuilderNodes(parsed.nodes),
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
    pending_testimonials: Array.isArray(parsed.pending_testimonials)
      ? parsed.pending_testimonials
      : Array.isArray(parsed.pendingTestimonials) ? parsed.pendingTestimonials : [],
  };
}

export function writeLocalWebsiteDraft(storage, schoolId, draft) {
  storage.setItem(websiteDraftStorageKey(schoolId), JSON.stringify({
    ...draft,
    canvas_size: normalizeWebsiteCanvasSize(draft.canvas_size || draft.canvasSize),
    nodes: normalizeWebsiteBuilderNodes(draft.nodes),
  }));
}

export function readWebsiteVersionHistory(storage, schoolId) {
  const raw = storage.getItem(websiteVersionHistoryStorageKey(schoolId));
  if (!raw) return { versions: [], activeVersionId: null };
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.versions)) {
    throw new Error("The saved website version history has an unsupported format.");
  }
  return {
    versions: parsed.versions.filter((version) =>
      version && typeof version.id === "string" && Number.isInteger(version.number) &&
      version.content && Array.isArray(version.content.nodes)
    ),
    activeVersionId: typeof parsed.activeVersionId === "string" ? parsed.activeVersionId : null,
  };
}

export function writeWebsiteVersionHistory(storage, schoolId, history) {
  storage.setItem(websiteVersionHistoryStorageKey(schoolId), JSON.stringify({
    versions: history.versions,
    activeVersionId: history.activeVersionId,
  }));
}

export function addWebsiteVersion(history, content, deployedAt = new Date().toISOString()) {
  const number = Math.max(0, ...history.versions.map((version) => version.number)) + 1;
  const version = {
    id: `website-version-${number}`,
    number,
    deployedAt,
    content: structuredClone(content),
  };
  return {
    versions: [version, ...history.versions],
    activeVersionId: version.id,
  };
}

export function restoreWebsiteVersionContent(version) {
  return structuredClone(version.content);
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

export function resizeHandleTooltip(mode) {
  const cornerLabels = {
    nw: "Top-Left Resize",
    ne: "Top-Right Resize",
    sw: "Bottom-Left Resize",
    se: "Bottom-Right Resize",
  };
  if (cornerLabels[mode]) return cornerLabels[mode];
  return mode === "e" || mode === "w"
    ? "Stretch horizontally"
    : "Stretch vertically";
}

export function resizeHandleClassName(mode) {
  return `handle${mode[0]?.toUpperCase() || ""}${mode.slice(1)}`;
}

export function resizeDimensionsTooltip(width, height) {
  return `W: ${Math.round(width)}px | H: ${Math.round(height)}px`;
}

export function resizeTooltipPosition(mode, clientX, clientY, bounds, viewportWidth, viewportHeight) {
  const tooltipWidth = 178;
  const tooltipHeight = 34;
  const gap = 12;
  let left = mode.includes("w") ? clientX - tooltipWidth - gap : clientX + gap;
  let top = mode.includes("n") ? clientY - tooltipHeight - gap : clientY + gap;

  if (mode === "e") left = bounds.right + gap;
  if (mode === "w") left = bounds.left - tooltipWidth - gap;
  if (mode === "n") top = bounds.top - tooltipHeight - gap;
  if (mode === "s") top = bounds.bottom + gap;

  return {
    left: Math.max(8, Math.min(left, viewportWidth - tooltipWidth - 8)),
    top: Math.max(8, Math.min(top, viewportHeight - tooltipHeight - 8)),
  };
}

export function createDefaultWebsiteNodes() {
  return [
    {
      id: "site-header", anchorId: "top", type: "header", title: "School header",
      x: 0, y: 0, width: 100, height: 9,
      labels: [
        { id: "nav-about", text: "About Us", anchorId: "about" },
        { id: "nav-programs", text: "Programs", anchorId: "programs" },
        { id: "nav-life", text: "Campus Life", anchorId: "campus-life" },
        { id: "nav-admissions", text: "Admissions", anchorId: "admissions" },
        { id: "nav-news", text: "News & Events", anchorId: "campus-life" },
        { id: "nav-contact", text: "Contact", anchorId: "contact" },
      ],
      html: "",
    },
    {
      id: "site-banner", anchorId: "welcome", type: "banner", title: "Welcome banner",
      x: 0, y: 9, width: 100, height: 27, slides: MOCK_BANNER_SLIDES.map((slide) => ({ ...slide })),
      html: "",
    },
    {
      id: "home-content", anchorId: "about", type: "center", title: "Welcome to Sunrise",
      x: 6, y: 39, width: 54, height: 14, labels: [],
      html: "<h2>Growing bright minds, together</h2><p>At Sunrise School, every child is known, encouraged and inspired. Our joyful classrooms combine strong foundations with hands-on discovery, helping students build the skills and confidence to shape their future.</p><p>Explore a school community where learning has purpose and every day brings something new.</p>",
    },
    {
      id: "programs-content", anchorId: "programs", type: "center", title: "Learning at Sunrise",
      x: 63, y: 39, width: 31, height: 14, labels: [],
      html: "<h3>Learning with purpose</h3><ul><li>Thoughtful, student-centred teaching</li><li>Arts, sport and hands-on exploration</li><li>A safe and welcoming campus</li></ul>",
    },
    {
      id: "campus-life-content", anchorId: "campus-life", type: "center", title: "A place to discover your strengths",
      x: 6, y: 56, width: 43, height: 13, labels: [],
      html: "<h3>More than a classroom</h3><p>From the first note in the music room to a winning goal on the field, students have space to try, practice and find what they love.</p><p><strong>Clubs · Arts · Sport · Community</strong></p>",
    },
    {
      id: "admissions-content", anchorId: "admissions", type: "center", title: "Admissions are open",
      x: 52, y: 56, width: 42, height: 13, labels: [],
      html: "<h3>Come see Sunrise for yourself</h3><p>Meet our teachers, explore the campus and discover a school day designed around belonging and possibility.</p><p><strong>Now welcoming applications for the new school year.</strong></p>",
    },
    {
      id: "testimonials", anchorId: "testimonials", type: "testimonials", title: "Families say it best",
      x: 5, y: 70, width: 90, height: 12, labels: [],
    },
    {
      id: "contact", anchorId: "contact", type: "contact", title: "Come say hello",
      x: 5, y: 84, width: 58, height: 8, labels: [],
    },
    {
      id: "site-footer", anchorId: "footer", type: "footer", title: "School footer",
      x: 0, y: 92, width: 100, height: 8,
      labels: [
        { id: "footer-about", text: "About Us", anchorId: "about" },
        { id: "footer-programs", text: "Programs", anchorId: "programs" },
        { id: "footer-admissions", text: "Admissions", anchorId: "admissions" },
        { id: "footer-news", text: "News & Events", anchorId: "campus-life" },
        { id: "footer-contact", text: "Contact", anchorId: "contact" },
      ],
      html: "<p>Sunrise School · Learning together, shining brighter.</p>",
    },
  ];
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
        type: ["header", "footer", "testimonial", "testimonials", "banner", "contact", "center"].includes(node.type) ? node.type : "center",
        title: typeof node.title === "string" ? node.title.slice(0, 120) : "Content",
        x,
        y,
        width: clampNumber(node.width, 8, 100 - x, 40),
        height: clampNumber(node.height, 8, 100 - y, 20),
        html: typeof node.html === "string" ? node.html : "",
        slides: Array.isArray(node.slides) ? node.slides.filter((slide) => slide && typeof slide.imageUrl === "string").map((slide) => ({
          id: typeof slide.id === "string" ? slide.id.slice(0, 100) : "banner-slide",
          imageUrl: slide.imageUrl.slice(0, 2000),
          title: typeof slide.title === "string" ? slide.title.slice(0, 200) : "",
          subtitle: typeof slide.subtitle === "string" ? slide.subtitle.slice(0, 500) : "",
        })) : [],
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
