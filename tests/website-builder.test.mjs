import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_WEBSITE_CANVAS_SIZE,
  MOCK_ACTIVE_TESTIMONIALS,
  MOCK_BANNER_SLIDES,
  MOCK_PENDING_TESTIMONIALS,
  approveQueuedTestimonial,
  createDefaultWebsiteNodes,
  normalizeWebsiteCanvasSize,
  normalizeWebsiteBuilderNodes,
  parseWebsiteBuilderContent,
  resizeHandleClassName,
  resizeDimensionsTooltip,
  resizeHandleTooltip,
  resizeTooltipPosition,
  readWebsiteBuilderDraft,
  serializeWebsiteBuilderContent,
  transformWebsiteNode,
  websiteBuilderDraftKey,
  writeWebsiteBuilderDraft,
} from "../src/utils/websiteBuilder.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("website builder canvas config round-trips through the existing home page body", () => {
  const nodes = [{
    id: "section-a",
    anchorId: "services",
    type: "center",
    title: "Services",
    x: 10,
    y: 20,
    width: 40,
    height: 30,
    html: "<p>Our services</p>",
    labels: [],
    slides: [],
  }];
  assert.deepEqual(parseWebsiteBuilderContent(serializeWebsiteBuilderContent(nodes)).nodes, nodes);
  assert.equal(parseWebsiteBuilderContent("<p>legacy body</p>"), null);
});

test("website builder draft is isolated by school and persists in local storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const draft = {
    schoolName: "Sunrise School",
    savedAt: "2026-10-10T12:00:00.000Z",
    canvasSize: { width: 1440, height: 1100 },
    testimonials: [],
    pendingTestimonials: [],
    nodes: [{
      id: "saved-content",
      anchorId: "welcome",
      type: "center",
      title: "Welcome",
      x: 10,
      y: 15,
      width: 50,
      height: 35,
      html: "<p>Welcome!</p>",
      labels: [],
    }],
  };

  writeWebsiteBuilderDraft(storage, 17, draft);
  assert.equal(websiteBuilderDraftKey(17), "schoolers-website-builder-draft:17");
  assert.deepEqual(readWebsiteBuilderDraft(storage, 17), {
    ...draft,
    version: 1,
    nodes: normalizeWebsiteBuilderNodes(draft.nodes),
  });
  assert.equal(readWebsiteBuilderDraft(storage, 18), null);
});

test("canvas dimensions use defaults and stay inside supported limits", () => {
  assert.deepEqual(normalizeWebsiteCanvasSize(), DEFAULT_WEBSITE_CANVAS_SIZE);
  assert.deepEqual(normalizeWebsiteCanvasSize({ width: 500, height: 9000 }), {
    width: 650,
    height: 5000,
  });
  assert.deepEqual(normalizeWebsiteCanvasSize({ width: 1800, height: 1200 }), {
    width: 1800,
    height: 1200,
  });
});

test("invalid local website drafts produce an explicit error", () => {
  const storage = {
    getItem: () => JSON.stringify({ version: 99, nodes: [] }),
    setItem: () => {},
  };
  assert.throws(() => readWebsiteBuilderDraft(storage, 1), /unsupported format/);
});

test("starter layout contains header navigation, banner, content, testimonials, contact, and footer", () => {
  const nodes = createDefaultWebsiteNodes();
  assert.deepEqual(nodes.map((node) => node.type), ["header", "banner", "center", "center", "center", "center", "testimonials", "contact", "footer"]);
  assert.equal(nodes[0].labels.length, 6);
  assert.equal(nodes.at(-1).labels.length, 5);
  assert.equal(nodes.find((node) => node.type === "banner").slides.length, 2);
  assert.deepEqual(nodes.find((node) => node.type === "banner").slides, MOCK_BANNER_SLIDES);
  assert.equal(MOCK_ACTIVE_TESTIMONIALS.length, 2);
  assert.equal(MOCK_PENDING_TESTIMONIALS.length, 3);
});

test("approving a queued testimonial moves it to the live website state", () => {
  const result = approveQueuedTestimonial(MOCK_PENDING_TESTIMONIALS, MOCK_ACTIVE_TESTIMONIALS, "pending-1");
  assert.equal(result.pending.length, 2);
  assert.equal(result.live.length, 3);
  assert.equal(result.live.at(-1).id, "pending-1");
  assert.equal(approveQueuedTestimonial(result.pending, result.live, "unknown").pending, result.pending);
});

test("normalizes coordinates, node types, and anchor ids before rendering", () => {
  const [node] = normalizeWebsiteBuilderNodes([{
    id: "node",
    anchorId: "services <script>",
    type: "invalid",
    x: 140,
    y: -4,
    width: 90,
    height: 90,
    labels: [{ id: "label", text: "Services", anchorId: "services & news" }],
  }]);
  assert.equal(node.type, "center");
  assert.equal(node.x, 92);
  assert.equal(node.y, 0);
  assert.equal(node.width, 8);
  assert.equal(node.height, 90);
  assert.equal(node.anchorId, "servicesscript");
  assert.equal(node.labels[0].anchorId, "servicesnews");
});

test("default canvas preserves existing home page copy as a content node", () => {
  const nodes = createDefaultWebsiteNodes({ body: "<p>Legacy school content</p>" });
  assert.equal(nodes.length, 9);
  assert.equal(nodes.find((node) => node.id === "home-content").html, "<p>Legacy school content</p>");
});

test("canvas nodes resize horizontally and vertically from each edge and corner", () => {
  const node = { x: 20, y: 25, width: 40, height: 30 };
  assert.deepEqual(transformWebsiteNode(node, "e", 10, 0), { x: 20, y: 25, width: 50, height: 30 });
  assert.deepEqual(transformWebsiteNode(node, "w", -10, 0), { x: 10, y: 25, width: 50, height: 30 });
  assert.deepEqual(transformWebsiteNode(node, "s", 0, 10), { x: 20, y: 25, width: 40, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "n", 0, -10), { x: 20, y: 15, width: 40, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "se", 10, 10), { x: 20, y: 25, width: 50, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "nw", -10, -10), { x: 10, y: 15, width: 50, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "ne", 10, -10), { x: 20, y: 15, width: 50, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "sw", -10, 10), { x: 10, y: 25, width: 50, height: 40 });
});

test("canvas node resizing respects the minimum size and canvas boundaries", () => {
  const node = { x: 0, y: 0, width: 20, height: 20 };
  assert.deepEqual(transformWebsiteNode(node, "w", -30, 0), { x: 0, y: 0, width: 20, height: 20 });
  assert.deepEqual(transformWebsiteNode(node, "e", 200, 0), { x: 0, y: 0, width: 100, height: 20 });
  assert.deepEqual(transformWebsiteNode(node, "n", 0, -30), { x: 0, y: 0, width: 20, height: 20 });
  assert.deepEqual(transformWebsiteNode(node, "s", 0, 200), { x: 0, y: 0, width: 20, height: 100 });
});

test("resize tooltips describe edge and corner handle intent", () => {
  assert.equal(resizeHandleTooltip("nw"), "Top-Left Resize");
  assert.equal(resizeHandleTooltip("ne"), "Top-Right Resize");
  assert.equal(resizeHandleTooltip("sw"), "Bottom-Left Resize");
  assert.equal(resizeHandleTooltip("se"), "Bottom-Right Resize");
  assert.equal(resizeHandleTooltip("e"), "Stretch horizontally");
  assert.equal(resizeHandleTooltip("w"), "Stretch horizontally");
  assert.equal(resizeHandleTooltip("n"), "Stretch vertically");
  assert.equal(resizeHandleTooltip("s"), "Stretch vertically");
});

test("each resize handle resolves to its CSS module positioning class", () => {
  assert.deepEqual(
    ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(resizeHandleClassName),
    ["handleNw", "handleN", "handleNe", "handleE", "handleSe", "handleS", "handleSw", "handleW"]
  );
});

test("resize dimension tooltip reports rounded current pixel dimensions", () => {
  assert.equal(resizeDimensionsTooltip(419.6, 179.5), "W: 420px | H: 180px");
});

test("resize tooltip remains outside the active handle edge and inside the viewport", () => {
  const bounds = { left: 100, top: 80, right: 500, bottom: 380 };
  assert.deepEqual(resizeTooltipPosition("e", 500, 180, bounds, 1000, 800), { left: 512, top: 192 });
  assert.deepEqual(resizeTooltipPosition("w", 100, 180, bounds, 1000, 800), { left: 8, top: 192 });
  assert.deepEqual(resizeTooltipPosition("n", 300, 80, bounds, 1000, 800), { left: 312, top: 34 });
  assert.deepEqual(resizeTooltipPosition("s", 300, 380, bounds, 1000, 800), { left: 312, top: 392 });
});

test("admin canvas route exposes local draft saving and saved-site preview", () => {
  const app = source("src/App.jsx");
  const shell = source("src/components/layout/AdminShell.jsx");
  const builder = source("src/pages/admin/AdminWebsiteBuilder.jsx");
  const publicCanvas = source("src/components/site/PublicSiteCanvas.jsx");
  assert.match(app, /path="my_website2"/);
  assert.match(shell, /label: "My_website2"/);
  assert.doesNotMatch(shell, /label: "School Website"/);
  assert.match(builder, /onContextMenu={openContextMenu}/);
  assert.match(builder, /Add Header Navigation Label/);
  assert.match(builder, /Content block HTML editor/);
  assert.match(builder, /Pending testimonials/);
  assert.match(publicCanvas, /Submit Message/);
  assert.match(builder, /Uploading media layout asset\.\.\./);
  assert.match(publicCanvas, /window\.alert\(/);
  assert.match(publicCanvas, /function scrollToSection\(event, anchorId\)/);
  assert.match(publicCanvas, /event\.preventDefault\(\)/);
  assert.match(publicCanvas, /target\.scrollIntoView\(/);
  assert.match(publicCanvas, /querySelectorAll\("\[id\]"\)/);
  assert.match(builder, /setShowGuides\(true\)/);
  assert.match(builder, /HANDLES\.map/);
  assert.match(builder, /setTimeout\(\(\) => \{[\s\S]*?\}, 400\)/);
  assert.match(builder, /resizeDimensionsTooltip\(/);
  assert.match(builder, /id="website-resize-tooltip"/);
  assert.match(builder, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(builder, /onLostPointerCapture={finishTransform}/);
  assert.match(builder, /writeWebsiteBuilderDraft\(window\.localStorage/);
  assert.match(builder, /Preview saved website/);
  assert.match(builder, /<PublicSiteCanvas nodes={savedDraft\.nodes}/);
  assert.match(builder, /onDrop=\{node\.type === "banner"/);
  assert.match(builder, /MOCK_DROP_BANNER_IMAGE/);
  assert.match(builder, /Add Header Navigation Label/);
  assert.match(builder, /Add New Center Content Box/);
  assert.match(builder, /Insert Mock Testimonial Section/);
  assert.match(builder, /Load sample school site/);
  assert.match(builder, /Canvas width in pixels/);
  assert.match(builder, /Canvas height in pixels/);
  assert.match(builder, /style=\{\{ width: `\$\{canvasSize\.width\}px`, height: `\$\{canvasSize\.height\}px` \}\}/);
  assert.doesNotMatch(builder, /websiteApi\.upsertPage/);
});
