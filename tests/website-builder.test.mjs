import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createDefaultWebsiteNodes,
  normalizeWebsiteBuilderNodes,
  parseWebsiteBuilderContent,
  serializeWebsiteBuilderContent,
  transformWebsiteNode,
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
  }];
  assert.deepEqual(parseWebsiteBuilderContent(serializeWebsiteBuilderContent(nodes)).nodes, nodes);
  assert.equal(parseWebsiteBuilderContent("<p>legacy body</p>"), null);
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
  assert.equal(nodes.length, 3);
  assert.equal(nodes.find((node) => node.anchorId === "home").html, "<p>Legacy school content</p>");
});

test("canvas nodes resize horizontally and vertically from each edge and corner", () => {
  const node = { x: 20, y: 25, width: 40, height: 30 };
  assert.deepEqual(transformWebsiteNode(node, "e", 10, 0), { x: 20, y: 25, width: 50, height: 30 });
  assert.deepEqual(transformWebsiteNode(node, "w", -10, 0), { x: 10, y: 25, width: 50, height: 30 });
  assert.deepEqual(transformWebsiteNode(node, "s", 0, 10), { x: 20, y: 25, width: 40, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "n", 0, -10), { x: 20, y: 15, width: 40, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "se", 10, 10), { x: 20, y: 25, width: 50, height: 40 });
  assert.deepEqual(transformWebsiteNode(node, "nw", -10, -10), { x: 10, y: 15, width: 50, height: 40 });
});

test("canvas node resizing respects the minimum size and canvas boundaries", () => {
  const node = { x: 0, y: 0, width: 20, height: 20 };
  assert.deepEqual(transformWebsiteNode(node, "w", -30, 0), { x: 0, y: 0, width: 20, height: 20 });
  assert.deepEqual(transformWebsiteNode(node, "e", 200, 0), { x: 0, y: 0, width: 100, height: 20 });
  assert.deepEqual(transformWebsiteNode(node, "n", 0, -30), { x: 0, y: 0, width: 20, height: 20 });
  assert.deepEqual(transformWebsiteNode(node, "s", 0, 200), { x: 0, y: 0, width: 20, height: 100 });
});

test("admin canvas route exposes context menus, editing, resizing, and database save", () => {
  const app = source("src/App.jsx");
  const shell = source("src/components/layout/AdminShell.jsx");
  const builder = source("src/pages/admin/AdminWebsiteBuilder.jsx");
  assert.match(app, /path="my_website2"/);
  assert.match(shell, /label: "my_website2"/);
  assert.match(builder, /onContextMenu={openContextMenu}/);
  assert.match(builder, /Add New Label/);
  assert.match(builder, /Content block HTML editor/);
  assert.match(builder, /HANDLES\.map/);
  assert.match(builder, /websiteApi\.upsertPage\("home"/);
});
