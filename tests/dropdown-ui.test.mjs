import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const globalCss = read("src/styles/global.css");
const tokensCss = read("src/styles/tokens.css");

const ruleBody = (source, selector, description = selector) => {
  const match = source.match(new RegExp(`${selector}\\s*\\{([^{}]*)\\}`, "s"));
  assert.ok(match, `missing ${description} rule`);
  return match[1];
};

const lightSurface = /var\(--(?:paper-light|color-input-bg|color-surface|color-surface-raised)\)/;
const textToken = /var\(--(?:ink|color-text)\)/;
const borderToken = /var\(--(?:line|color-input-border|color-border)\)/;
const hardCodedColor = /#[0-9a-fA-F]{3,8}\b|\b(?:white|black)\b|rgba?\(/i;

test("shared select rules provide readable light controls and tokenized surfaces", () => {
  const fieldRule = ruleBody(
    globalCss,
    "\\.field\\s+input,\\s*\\.field\\s+select,\\s*\\.field\\s+textarea",
    ".field input, .field select, .field textarea"
  );
  const standaloneRule = ruleBody(globalCss, "\\.select-input", ".select-input");

  for (const [name, body] of [["field controls", fieldRule], ["standalone select", standaloneRule]]) {
    assert.match(body, lightSurface, `${name} should use a light surface token`);
    assert.match(body, textToken, `${name} should use a readable text token`);
    assert.match(body, borderToken, `${name} should use a border token`);
    assert.doesNotMatch(body, hardCodedColor, `${name} should not hard-code a color`);
  }
});

test("shared select rules preserve a native arrow and style focus and options", () => {
  const focusRule = ruleBody(
    globalCss,
    "(?:\\.field\\s+select|\\.select-input|select):focus(?:-visible)?",
    "shared select focus"
  );
  assert.match(focusRule, /border(?:-color)?\s*:\s*[^;]*var\(--(?:color-focus|focus|pencil-yellow-dark)\)/);
  assert.match(focusRule, /outline\s*:/, "select focus should remain visibly outlined");

  const optionRule = ruleBody(
    globalCss,
    "(?:\\.field\\s+select|\\.select-input|select)\\s+option(?::[\\w-]+)?",
    "shared select option"
  );
  assert.match(optionRule, lightSurface, "options should use a light surface token");
  assert.match(optionRule, textToken, "options should use a readable text token");

  const sharedSelectCss = globalCss.match(/(?:\.field\s+select|\.select-input|select)[^{]*\{[^{}]*\}/gs)?.join("\n") || "";
  assert.match(
    sharedSelectCss,
    /appearance\s*:\s*(?:auto|menulist|none)\b/,
    "shared select styling should explicitly preserve native appearance or define an equivalent"
  );
  if (/appearance\s*:\s*none\b/.test(sharedSelectCss)) {
    assert.match(sharedSelectCss, /background-image\s*:/, "appearance:none requires a replacement arrow");
  }
});

test("dropdown surface tokens define the light background, text, border, and focus contract", () => {
  for (const token of [
    "--color-input-bg",
    "--color-input-border",
    "--color-text",
    "--color-focus",
    "--color-surface-raised",
  ]) {
    assert.match(tokensCss, new RegExp(`${token}:\\s*[^;]+;`), `missing dropdown token ${token}`);
  }

  assert.match(globalCss, /var\(--(?:color-input-bg|color-surface-raised|paper-light)\)/);
  assert.match(globalCss, /var\(--(?:color-text|ink)\)/);
  assert.match(globalCss, /var\(--(?:color-input-border|color-border|line)\)/);
});

test("page-specific dropdown overrides keep light tokenized surfaces", () => {
  const broadcastCss = read("src/pages/admin/AdminBroadcast.module.css");
  const broadcastSelect = ruleBody(
    broadcastCss,
    "\\.filterCard\\s+\\.field\\s+select",
    "AdminBroadcast filter select"
  );
  assert.match(broadcastSelect, lightSurface);
  assert.match(broadcastSelect, textToken);
  assert.match(broadcastSelect, borderToken);
  assert.doesNotMatch(broadcastSelect, hardCodedColor);

  const tripHistoryCss = read("src/pages/admin/AdminTripHistory.module.css");
  const tripHistorySelect = ruleBody(
    tripHistoryCss,
    "\\.filterSelect,\\s*\\.filterInput",
    "AdminTripHistory filter controls"
  );
  assert.match(tripHistorySelect, /background(?:-color)?:\s*var\(--color-surface-raised\)/);
  assert.match(tripHistorySelect, /color:\s*var\(--color-text\)/);
  assert.match(tripHistorySelect, /border:[^;]*var\(--color-border\)/);
  assert.doesNotMatch(tripHistorySelect, hardCodedColor);
});

test("website builder selects and context menu do not override shared styling with hard-coded colors", () => {
  const builderCss = read("src/pages/admin/AdminWebsiteBuilder.module.css");
  const builderSelect = ruleBody(
    builderCss,
    "\\.variantControl\\s+select,\\s*\\.toolbar\\s+select",
    "AdminWebsiteBuilder select"
  );
  assert.match(builderSelect, lightSurface, "website builder selects should use a light token");
  assert.match(builderSelect, textToken, "website builder selects should use a text token");
  assert.match(builderSelect, borderToken, "website builder selects should use a border token");
  assert.doesNotMatch(builderSelect, hardCodedColor, "website builder selects should not use hard-coded colors");

  const contextMenu = ruleBody(builderCss, "\\.contextMenu", "website builder context menu");
  const contextMenuButton = ruleBody(builderCss, "\\.contextMenu\\s+button", "website builder context menu button");
  for (const [name, body] of [["context menu", contextMenu], ["context menu button", contextMenuButton]]) {
    assert.match(body, lightSurface, `${name} should use a light surface token`);
    assert.match(body, textToken, `${name} should use a text token`);
    assert.doesNotMatch(body, hardCodedColor, `${name} should not hard-code a surface color`);
  }
});

test("shared Select keeps its hidden native select out of the scroll area", () => {
  // The accessible native select is visually hidden but stays in the layout
  // tree, so without pinned offsets its box can land far down a wide
  // container and stretch document scrollWidth (seen on Broadcast pages).
  const selectCss = read("src/components/ui/Select.module.css");
  const body = ruleBody(selectCss, "\\.nativeSelect", "Select nativeSelect");
  assert.match(body, /position:\s*absolute/, "hidden native select should be absolutely positioned");
  assert.match(body, /top:\s*0/, "hidden native select should be pinned to the top");
  assert.match(body, /left:\s*0/, "hidden native select should be pinned to the left");
  assert.match(body, /width:\s*1px/, "hidden native select should stay 1px wide");
  assert.match(body, /height:\s*1px/, "hidden native select should stay 1px tall");
});
