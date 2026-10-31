// Deep Agents Backends: class deck in Anthropic brand style.
// Palette and fonts follow Anthropic's brand-guidelines skill (github.com/anthropics/skills).
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const lu = require("react-icons/lu");
// apply_theme.js comes from Anthropic's pptx skill (github.com/anthropics/skills). Point PPTX_SKILL_DIR at that skill folder.
const path = require("path");
if (!process.env.PPTX_SKILL_DIR) throw new Error("Set PPTX_SKILL_DIR to the folder of Anthropic's pptx skill (it contains scripts/apply_theme.js).");
const { applyTheme } = require(path.join(process.env.PPTX_SKILL_DIR, "scripts", "apply_theme.js"));

const HEX = {
  dark: "141413", light: "FAF9F5", white: "FFFFFF", mid: "B0AEA5", lightGray: "E8E6DC",
  orange: "D97757", blue: "6A9BCC", green: "788C5D", text2: "5E5D59",
};
const THEME = {
  name: "Anthropic Brand",
  headFontFace: "Poppins",
  bodyFontFace: "Lora",
  colors: {
    dk1: HEX.dark, lt1: HEX.white, dk2: HEX.text2, lt2: HEX.light,
    accent1: HEX.orange, accent2: HEX.blue, accent3: HEX.green, accent4: HEX.mid,
    accent5: HEX.lightGray, accent6: "C15F3C", hlink: HEX.blue, folHlink: HEX.green,
  },
};
const HEAD = "Poppins";
const CODE = "Courier New";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Deep Agents Backends";
pres.author = "Deep Agents class";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const ORANGE = C.accent1, BLUE = C.accent2, GREEN = C.accent3, MID = C.accent4, LGRAY = C.accent5;
const DARK = C.text1, TEXT2 = C.text2, WHITE = C.background1, BG = C.background2;

// ---------- layouts ----------
const footer = (color) => [
  { text: { text: "Deep Agents  |  Backends", options: { x: 0.6, y: 6.95, w: 6, h: 0.3, fontSize: 10, color, margin: 0 } } },
];
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.95, w: 11.7, h: 1.85, fontSize: 54, bold: true, color: HEX.light, fontFace: HEAD, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.95, w: 11.9, h: 1.1, fontSize: 21, color: HEX.mid, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SECTION_DARK",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.4, w: 11.7, h: 1.7, fontSize: 44, bold: true, color: HEX.light, fontFace: HEAD, align: "left", valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.35, w: 11.0, h: 1.0, fontSize: 20, color: HEX.mid, valign: "top", margin: 0 }, text: "" } },
    ...footer(HEX.text2),
  ],
  slideNumber: { x: 12.2, y: 6.95, w: 0.6, h: 0.3, fontSize: 10, color: HEX.text2, align: "right" },
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: BG },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 34, bold: true, color: HEX.dark, fontFace: HEAD, align: "left", valign: "middle", margin: 0 }, text: "" } },
    ...footer(HEX.mid),
  ],
  slideNumber: { x: 12.2, y: 6.95, w: 0.6, h: 0.3, fontSize: 10, color: HEX.mid, align: "right" },
});

// ---------- helpers ----------
const iconCache = {};
async function icon(name, hex) {
  const key = name + hex;
  if (!iconCache[key]) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(lu[name], { color: "#" + hex, size: 256 }));
    const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
    iconCache[key] = "image/png;base64," + buf.toString("base64");
  }
  return iconCache[key];
}
const shadow = () => ({ type: "outer", color: "000000", opacity: 0.08, blur: 8, offset: 2, angle: 90 });

let n = 0;
function slide(master, section, notes) {
  const s = pres.addSlide({ masterName: master, sectionTitle: section });
  if (notes) s.addNotes(notes);
  n += 1;
  return s;
}
function title(s, t) { s.addText(t, { placeholder: "title" }); }
function sub(s, t) { s.addText(t, { placeholder: "body" }); }

async function iconBadge(s, x, y, size, name, fill, iconHex = HEX.white) {
  s.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color: fill }, line: { type: "none" }, objectName: "badge " + name });
  const pad = size * 0.24;
  s.addImage({ data: await icon(name, iconHex), x: x + pad, y: y + pad, w: size - 2 * pad, h: size - 2 * pad, altText: name.replace("Lu", "") + " icon" });
}

async function card(s, o) {
  const { x, y, w, h } = o;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || WHITE }, line: { type: "none" }, shadow: shadow(), objectName: "card " + (o.title || "") });
  let ty = y + 0.28;
  if (o.icon) {
    await iconBadge(s, x + 0.3, y + 0.3, 0.62, o.icon, o.iconFill || ORANGE);
    ty = y + 1.08;
  }
  if (o.title) {
    s.addText(o.title, { x: x + 0.3, y: ty, w: w - 0.6, h: 0.45, fontFace: o.titleFont || HEAD, fontSize: o.titleSize || 17, bold: true, color: o.titleColor || DARK, margin: 0, valign: "top", isTextBox: true });
    ty += 0.5;
  }
  if (o.body) {
    s.addText(o.body, { x: x + 0.3, y: ty, w: w - 0.6, h: y + h - ty - 0.2, fontSize: o.bodySize || 14, color: o.bodyColor || TEXT2, margin: 0, valign: "top", paraSpaceAfter: 4, isTextBox: true });
  }
}

function chip(s, text, x, y, fill = ORANGE, color = WHITE, w) {
  const width = w || Math.max(1.2, text.length * 0.095 + 0.4);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: width, h: 0.36, rectRadius: 0.18, fill: { color: fill }, line: { type: "none" }, objectName: "chip " + text });
  s.addText(text, { x, y, w: width, h: 0.36, fontFace: HEAD, fontSize: 11, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true });
}

function bullets(s, items, x, y, w, h, size = 16, color = DARK) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1 } })),
    { x, y, w, h, fontSize: size, color, paraSpaceAfter: 8, valign: "top", margin: 0, isTextBox: true });
}

function table(s, rows, x, y, w, colW, opts = {}) {
  const size = opts.fontSize || 13;
  const data = rows.map((r, ri) => r.map((cell) => ({
    text: cell,
    options: ri === 0
      ? { bold: true, color: HEX.light, fill: { color: HEX.dark }, fontFace: THEME.headFontFace, fontSize: size }
      : { color: HEX.dark, fill: { color: ri % 2 ? HEX.white : HEX.light }, fontSize: size },
  })));
  s.addTable(data, { x, y, w, colW, border: { type: "solid", pt: 0.5, color: HEX.lightGray }, margin: [5, 8, 5, 8], valign: "middle", rowH: opts.rowH || 0.42 });
}

function arrow(s, x1, y1, x2, y2, color = HEX.mid) {
  s.addShape(pres.shapes.LINE, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width: 2, endArrowType: "triangle" } });
}

function code(s, text, x, y, w, h, size = 13) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: DARK }, line: { type: "none" }, objectName: "code block" });
  s.addText(text, { x: x + 0.25, y: y + 0.18, w: w - 0.5, h: h - 0.36, fontFace: CODE, fontSize: size, color: HEX.light, valign: "top", margin: 0, isTextBox: true });
}

function callout(s, text, x, y, w, h, fill = ORANGE, color = WHITE, size = 18) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { type: "none" }, objectName: "callout" });
  s.addText(text, { x: x + 0.3, y, w: w - 0.6, h, fontFace: HEAD, fontSize: size, bold: true, color, valign: "middle", margin: 0, isTextBox: true });
}

// ---------- slides ----------
async function build() {
  // 1. Title
  pres.addSection({ title: "Opening" });
  let s = slide("TITLE_DARK", "Opening",
    "Welcome. Today is about one question: when a deep agent writes a file, where does it actually go? By the end you will be able to choose, combine, build and lock down backends for real products. Everything is backed by six runnable notebooks.");
  title(s, "Deep Agents Backends");
  sub(s, "Where your agent's files live, how long they last, and who can see them");
  chip(s, "LangChain Deep Agents  |  6 hands on notebooks", 0.8, 1.55, ORANGE, WHITE, 4.6);

  // 2. Roadmap
  s = slide("CONTENT", "Opening", "This is the route through the class. Each card is one notebook. Every notebook ends with a quiz.");
  title(s, "The route through today's class");
  const road = [
    ["01", "StateBackend basics", "What a backend is. The default, thread scoped store.", "LuLayers"],
    ["02", "Filesystem + Shell", "Real disk, real shell, and how not to get burned.", "LuTerminal"],
    ["03", "Store + namespaces", "Memory across conversations, isolated per user.", "LuDatabase"],
    ["04", "Composite + Hub", "Many storage systems behind one filesystem.", "LuSplit"],
    ["05", "Custom + rules", "Your own storage and enforceable rules.", "LuShieldCheck"],
    ["06", "Capstone: choosing", "Five questions and a multi tenant copilot.", "LuCompass"],
  ];
  for (let i = 0; i < road.length; i++) {
    const [num, t, b, ic] = road[i];
    const x = 0.6 + (i % 3) * 4.1, y = 1.55 + Math.floor(i / 3) * 2.65;
    await card(s, { x, y, w: 3.85, h: 2.4, icon: ic, iconFill: i % 2 ? DARK : ORANGE, title: t, body: b });
    s.addText("Notebook " + num, { x: x + 1.1, y: y + 0.42, w: 2.4, h: 0.35, fontFace: HEAD, fontSize: 12, bold: true, color: ORANGE, margin: 0, isTextBox: true });
  }

  // 3. The problem
  s = slide("CONTENT", "Opening", "LLMs have a limited working memory. Deep agents give them a filesystem, with the same tools a developer uses in a terminal. The backend decides where those files really go.");
  title(s, "Agents need a place to put things");
  s.addText("The context window is small. Research notes, drafts, code, logs and huge API responses are not.", { x: 0.6, y: 1.4, w: 12, h: 0.5, fontSize: 18, color: TEXT2, margin: 0, isTextBox: true });
  const tools = [["ls", "list a folder"], ["read_file", "read, paginated, images too"], ["write_file", "create or overwrite"], ["edit_file", "find and replace"], ["delete", "hidden if unsupported"], ["glob", "find by pattern"], ["grep", "search contents"], ["execute", "sandbox and LocalShell only"]];
  for (let i = 0; i < tools.length; i++) {
    const x = 0.6 + (i % 4) * 3.07, y = 2.25 + Math.floor(i / 4) * 1.5;
    const special = tools[i][0] === "execute";
    await card(s, { x, y, w: 2.85, h: 1.3, title: tools[i][0], titleFont: CODE, titleColor: special ? ORANGE : DARK, body: tools[i][1] });
  }
  callout(s, "The tools never change. The backend decides where the bytes go.", 0.6, 5.5, 12.1, 0.95, DARK, HEX.light, 20);

  // 4. Mental model
  s = slide("CONTENT", "Opening", "Think of it like a laptop. The file explorer looks the same whether you save to RAM, the SSD, a USB stick or a cloud drive. The backend is the drive you plug in. Composite is a hub that plugs in several drives at different folders.");
  title(s, "A backend is the drive you plug in");
  await card(s, { x: 0.6, y: 2.4, w: 2.4, h: 2.05, icon: "LuSparkles", title: "Agent", body: "decides what to do", iconFill: ORANGE });
  await card(s, { x: 3.6, y: 2.4, w: 2.6, h: 2.05, icon: "LuFolderTree", title: "Filesystem tools", body: "ls, read, write, grep...", iconFill: DARK });
  await card(s, { x: 6.8, y: 2.4, w: 2.4, h: 2.05, icon: "LuRoute", title: "Backend", body: "BackendProtocol", iconFill: ORANGE });
  arrow(s, 3.05, 3.4, 3.55, 3.4); arrow(s, 6.25, 3.4, 6.75, 3.4);
  const stores = [["State", "LuMemoryStick"], ["Disk", "LuHardDrive"], ["Store", "LuDatabase"], ["Context Hub", "LuGitBranch"], ["Sandbox", "LuBoxes"], ["Custom", "LuPuzzle"]];
  for (let i = 0; i < stores.length; i++) {
    const y = 1.45 + i * 0.86;
    await iconBadge(s, 10.0, y, 0.6, stores[i][1], i % 2 ? BLUE : GREEN);
    s.addText(stores[i][0], { x: 10.75, y, w: 2.0, h: 0.6, fontFace: HEAD, fontSize: 15, bold: true, color: DARK, valign: "middle", margin: 0, isTextBox: true });
  }
  arrow(s, 9.25, 3.4, 9.9, 3.4);
  s.addText("Sandbox and LocalShell also add the execute tool. Composite routes folders to any of these.", { x: 0.6, y: 5.0, w: 8.6, h: 0.8, fontSize: 15, color: TEXT2, margin: 0, italic: true, isTextBox: true });

  // 5. Landscape
  s = slide("CONTENT", "Opening", "This is the whole page on one slide. Keep it in mind: where files live, how long they last, and what each one is best for.");
  title(s, "The backend landscape");
  table(s, [
    ["Backend", "Where files live", "Lifetime", "Best for"],
    ["StateBackend (default)", "LangGraph agent state", "One thread", "Scratch pad, big tool outputs"],
    ["FilesystemBackend", "Real disk under root_dir", "Permanent", "Local dev, CI, mounted volumes"],
    ["LocalShellBackend", "Disk plus host shell", "Permanent", "Trusted local coding assistants"],
    ["StoreBackend", "LangGraph BaseStore", "Across threads", "Memories, per user data"],
    ["ContextHubBackend", "LangSmith Hub repo", "Durable, with commits", "Versioned instructions and skills"],
    ["Sandbox", "Isolated machine", "Sandbox lifetime", "Running untrusted code"],
    ["CompositeBackend", "Routes to the others", "Per route", "Mixing all of the above"],
  ], 0.6, 1.5, 12.1, [3.0, 3.2, 2.3, 3.6], { fontSize: 14, rowH: 0.6 });

  // ---------- Section 1 ----------
  pres.addSection({ title: "StateBackend" });
  s = slide("SECTION_DARK", "StateBackend", "Notebook 1. The default backend.");
  chip(s, "Notebook 01", 0.8, 1.8);
  title(s, "StateBackend: the default scratch pad");
  sub(s, "Files live inside LangGraph state, scoped to one conversation thread");

  s = slide("CONTENT", "StateBackend", "Demo from notebook 1: the travel planner. Same checkpointer, two thread ids. Thread one still has its itinerary, thread two sees an empty folder. Nothing touched the disk.");
  title(s, "Same thread remembers, new thread forgets");
  code(s, "planner = create_deep_agent(\n    model=MODEL,\n    backend=StateBackend(),   # the default\n    checkpointer=InMemorySaver(),\n)", 0.6, 1.5, 5.9, 2.1, 14);
  bullets(s, ["Files sit in state[\"files\"], saved by the checkpointer", "Persist across turns of the same thread", "Not shared across threads", "Shared by the supervisor and all subagents"], 0.6, 3.95, 5.9, 2.6, 16);
  await card(s, { x: 7.0, y: 1.5, w: 5.7, h: 2.35, icon: "LuCheck", iconFill: GREEN, title: "thread \"trip-to-lisbon\"", body: "Turn 1 writes /plan/itinerary.md\nTurn 2 reads it back and edits day 2" });
  await card(s, { x: 7.0, y: 4.1, w: 5.7, h: 2.35, icon: "LuX", iconFill: ORANGE, title: "thread \"someone-else\"", body: "ls /plan  =>  No files found\nNew conversation, fresh filesystem" });

  s = slide("CONTENT", "StateBackend", "Two hidden superpowers. Subagents hand off big work products through shared files. And huge tool outputs are evicted to /large_tool_results and paged back with grep or read_file. In the demo, a 179 thousand character log never entered the model's context.");
  title(s, "Two superpowers you get for free");
  await card(s, { x: 0.6, y: 1.5, w: 5.9, h: 4.9, icon: "LuUsers", iconFill: DARK, title: "Subagents share files", body: "Researcher subagent writes /research/notes.md and returns one sentence.\n\nThe supervisor reads the full notes later. Files outlive the subagent.\n\nFiles are the cheapest hand off between agents." });
  await card(s, { x: 6.8, y: 1.5, w: 5.9, h: 4.9, icon: "LuFileSearch", iconFill: ORANGE, title: "Large outputs are evicted", body: "Tool results over about 20k tokens go to /large_tool_results/<id>.\n\nThe model gets a preview plus the path, then greps for what it needs." });
  s.addText("179,329", { x: 7.1, y: 4.65, w: 5.3, h: 0.9, fontFace: HEAD, fontSize: 48, bold: true, color: ORANGE, margin: 0, isTextBox: true });
  s.addText("characters of logs that never entered the context window", { x: 7.1, y: 5.55, w: 5.3, h: 0.6, fontSize: 13, color: TEXT2, margin: 0, isTextBox: true });

  // ---------- Section 2 ----------
  pres.addSection({ title: "Filesystem and LocalShell" });
  s = slide("SECTION_DARK", "Filesystem and LocalShell", "Notebook 2. Real disk and a real shell.");
  chip(s, "Notebook 02", 0.8, 1.8);
  title(s, "Real disk, real shell");
  sub(s, "FilesystemBackend and LocalShellBackend, and how not to get burned");

  s = slide("CONTENT", "Filesystem and LocalShell", "We tried three escape attempts against a FilesystemBackend with virtual_mode=True. All blocked. Then the same backend with virtual_mode=False read a fake payment key from outside the root. Rule: always pass virtual_mode=True. In deepagents 0.7 the default is already True, but older docs and versions default to False.");
  title(s, "virtual_mode=True is your seatbelt");
  table(s, [
    ["Agent asks to read", "virtual_mode=True", "virtual_mode=False"],
    ["/../secrets.env", "Blocked: path traversal", "Leaks the file"],
    ["~/.ssh/id_rsa", "Not found (no ~ expansion)", "Reachable"],
    ["/etc/hosts", "Mapped inside root, not found", "Reads the host file"],
  ], 0.6, 1.55, 7.6, [2.4, 2.6, 2.6], { fontSize: 14, rowH: 0.62 });
  await card(s, { x: 8.6, y: 1.55, w: 4.1, h: 2.8, icon: "LuKeyRound", iconFill: ORANGE, title: "What leaked in the demo", body: "A fake PAYMENT_API_KEY from outside the root folder", bodySize: 14 });
  callout(s, "Always: FilesystemBackend(root_dir=..., virtual_mode=True)", 0.6, 4.6, 12.1, 0.9, DARK, HEX.light, 20);
  s.addText("Never on web servers or HTTP APIs. Use State, Store or a sandbox there.", { x: 0.6, y: 5.75, w: 12, h: 0.5, fontSize: 15, color: TEXT2, italic: true, margin: 0, isTextBox: true });

  s = slide("CONTENT", "Filesystem and LocalShell", "Deep agents write internal data through the backend. With FilesystemBackend alone, the large tool result folder appeared next to pricing.py. The fix from the docs: route your project to /workspace/ and keep StateBackend as the default.");
  title(s, "Keep agent junk out of your project");
  await card(s, { x: 0.6, y: 1.5, w: 5.9, h: 2.75, icon: "LuTriangleAlert", iconFill: ORANGE, title: "FilesystemBackend alone", body: "shop_app/pricing.py\nshop_app/large_tool_results/call_GSCa...\nInternal files land in your repo." });
  await card(s, { x: 6.8, y: 1.5, w: 5.9, h: 2.75, icon: "LuCheck", iconFill: GREEN, title: "Wrapped in CompositeBackend", body: "/workspace/* goes to real disk\n/large_tool_results/* stays in state\nProject folder stays clean." });
  code(s, "CompositeBackend(\n    default=StateBackend(),\n    routes={\"/workspace/\": FilesystemBackend(root_dir=PROJECT, virtual_mode=True)},\n)", 0.6, 4.5, 12.1, 1.75, 15);

  s = slide("CONTENT", "Filesystem and LocalShell", "LocalShellBackend extends FilesystemBackend with execute, using subprocess.run with shell=True on your machine. The demo: the agent ran unittest, read the code, fixed the discount bug and reran the tests. But note: the shell ignores virtual_mode. ls .. showed the fake secrets file.");
  title(s, "LocalShellBackend adds execute on your host");
  table(s, [
    ["Option", "Default", "Why it matters"],
    ["timeout", "120 s", "Kills runaway commands"],
    ["max_output_bytes", "100,000", "Truncates huge output"],
    ["env", "{}", "Pass a minimal PATH, no secrets"],
    ["inherit_env", "False", "True leaks your whole environment"],
  ], 0.6, 1.5, 6.6, [2.1, 1.4, 3.1], { fontSize: 14, rowH: 0.55 });
  await card(s, { x: 7.6, y: 1.5, w: 5.1, h: 2.7, icon: "LuTerminal", iconFill: GREEN, title: "Demo: fix the failing test", body: "Run tests, read pricing.py, edit the bug, rerun.\nprice - percent  =>  price * (1 - percent / 100)" });
  callout(s, "virtual_mode does not protect the shell. cat ../secrets.env just works.", 0.6, 4.75, 12.1, 0.95, ORANGE, WHITE, 19);

  s = slide("CONTENT", "Filesystem and LocalShell", "A real lesson from rehearsing this class. We only gated execute. Asked to remove the config folder, the agent used the delete file tool instead, which was not gated, and the folder was gone. After gating delete as well, the request paused and we rejected it.");
  title(s, "Gate every destructive tool, not just the shell");
  await card(s, { x: 0.6, y: 1.5, w: 5.9, h: 3.0, icon: "LuX", iconFill: ORANGE, title: "Rehearsal: interrupt_on={\"execute\": True}", body: "User: remove the config folder.\nAgent skipped the shell and called delete(/config).\nNot gated. Folder gone." });
  await card(s, { x: 6.8, y: 1.5, w: 5.9, h: 3.0, icon: "LuHand", iconFill: GREEN, title: "Fixed: execute and delete gated", body: "Run pauses with an action request.\nReviewer rejects: \"Never delete config.\"\nFolder still exists." });
  code(s, "interrupt_on={\"execute\": True, \"delete\": True}\nCommand(resume={\"decisions\": [{\"type\": \"reject\", \"message\": \"Never delete config.\"}]})", 0.6, 4.8, 12.1, 1.3, 14);

  s = slide("CONTENT", "Filesystem and LocalShell", "Summary of where these two backends belong.");
  title(s, "Where these backends belong");
  await card(s, { x: 0.6, y: 1.5, w: 5.9, h: 4.9, icon: "LuCheck", iconFill: GREEN, title: "Good fit", body: "Personal coding assistant or CLI on your laptop\nDoc writer that edits docs/ in a repo\nCI job with secrets stripped from env\nAnalysing a mounted persistent volume" });
  await card(s, { x: 6.8, y: 1.5, w: 5.9, h: 4.9, icon: "LuX", iconFill: ORANGE, title: "Never", body: "Web servers and HTTP APIs\nMulti tenant SaaS\nProcessing untrusted input\nRunning untrusted code\n\nUse StateBackend, StoreBackend or a sandbox instead." });

  // ---------- Section 3 ----------
  pres.addSection({ title: "StoreBackend" });
  s = slide("SECTION_DARK", "StoreBackend", "Notebook 3. Memory that outlives the conversation.");
  chip(s, "Notebook 03", 0.8, 1.8);
  title(s, "StoreBackend: memory across conversations");
  sub(s, "Durable files in a LangGraph store, isolated by namespace factories");

  s = slide("CONTENT", "StoreBackend", "A store is a key value database grouped into namespaces. StoreBackend maps the file path to the key, and a namespace factory you write decides the namespace. In the chef demo Alice said she was vegetarian on Monday, and on Friday, in a brand new thread, the agent read her profile.");
  title(s, "Paths become keys, you choose the namespace");
  await card(s, { x: 0.6, y: 1.5, w: 3.6, h: 2.1, fill: DARK, title: "namespace", titleColor: ORANGE, body: "(\"alice\", \"filesystem\")", bodyColor: HEX.light, bodySize: 16 });
  await card(s, { x: 4.6, y: 1.5, w: 3.6, h: 2.1, fill: DARK, title: "key", titleColor: ORANGE, body: "\"/profile.md\"", bodyColor: HEX.light, bodySize: 16 });
  await card(s, { x: 8.6, y: 1.5, w: 4.1, h: 2.1, fill: DARK, title: "value", titleColor: ORANGE, body: "{content, encoding, created_at, modified_at}", bodyColor: HEX.light, bodySize: 15 });
  code(s, "StoreBackend(namespace=lambda rt: (rt.context.user_id, \"filesystem\"))\n# store=InMemoryStore() locally, PostgresStore self hosted, omit on LangSmith Deployment", 0.6, 3.95, 12.1, 1.25, 14);
  await card(s, { x: 0.6, y: 5.45, w: 12.1, h: 1.15, icon: null, title: "Monday thread writes /profile.md. Friday thread (new) reads it. Persists across threads.", titleSize: 16 });

  s = slide("CONTENT", "StoreBackend", "The namespace factory receives a Runtime. context is whatever you pass in. server_info only exists on LangGraph Server, so locally it is None. execution_info gives the thread id. Pick the scope based on who should see the data.");
  title(s, "Namespace factories decide who sees what");
  table(s, [
    ["Runtime field", "Contains", "Local?"],
    ["rt.context", "Your context_schema (user_id, org_id)", "Yes"],
    ["rt.server_info", "Assistant id, authenticated user", "No, deployed only"],
    ["rt.execution_info", "thread_id, run_id, checkpoint_id", "Yes"],
  ], 0.6, 1.5, 6.3, [1.9, 3.0, 1.4], { fontSize: 13, rowH: 0.62 });
  const scopes = [["Per user", "Personal memory, preferences", "LuUsers"], ["Per assistant", "Shared FAQ for all employees", "LuSparkles"], ["Per thread", "Durable per ticket workspace", "LuMessagesSquare"], ["Combined", "(org_id, thread_id) for SaaS", "LuBuilding2"]];
  for (let i = 0; i < 4; i++) {
    const x = 7.3 + (i % 2) * 2.75, y = 1.5 + Math.floor(i / 2) * 2.55;
    await card(s, { x, y, w: 2.55, h: 2.35, icon: scopes[i][2], iconFill: i % 2 ? BLUE : GREEN, title: scopes[i][0], body: scopes[i][1], bodySize: 13, titleSize: 16 });
  }
  s.addText("Tenant first. Wildcards like * are rejected to block glob injection.", { x: 0.6, y: 4.3, w: 6.3, h: 0.9, fontSize: 15, color: TEXT2, italic: true, margin: 0, isTextBox: true });

  s = slide("CONTENT", "StoreBackend", "We simulated the classic bug: one namespace for everyone. Alice saved her shellfish allergy. Mallory asked what is in my profile and got Alice's medical data. Current deepagents makes namespace required, which forces this decision.");
  title(s, "One namespace for everyone is a data leak");
  code(s, "StoreBackend(namespace=lambda _rt: (\"shared\",))   # BUG", 0.6, 1.5, 12.1, 0.8, 16);
  await card(s, { x: 0.6, y: 2.6, w: 5.9, h: 2.3, icon: "LuUsers", iconFill: GREEN, title: "Alice", body: "write /profile.md\n\"Name: Alice. Allergy: shellfish.\"" });
  await card(s, { x: 6.8, y: 2.6, w: 5.9, h: 2.3, icon: "LuEye", iconFill: ORANGE, title: "Mallory", body: "\"What is in my profile?\"\nAgent: Name: Alice, Allergy: shellfish" });
  callout(s, "The namespace factory is your tenant isolation boundary.", 0.6, 5.25, 12.1, 0.95, DARK, HEX.light, 20);

  // ---------- Section 4 ----------
  pres.addSection({ title: "Composite and ContextHub" });
  s = slide("SECTION_DARK", "Composite and ContextHub", "Notebook 4.");
  chip(s, "Notebook 04", 0.8, 1.8);
  title(s, "One filesystem, many storage systems");
  sub(s, "CompositeBackend routing and ContextHubBackend");

  s = slide("CONTENT", "Composite and ContextHub", "Routing is by path prefix. Longest prefix wins. The prefix is stripped before reaching the sub backend, like mounting a USB drive. ls, glob and grep aggregate across all backends and show the original prefixes. Internal data goes to the default, so keep the default ephemeral.");
  title(s, "Routing rules in four lines");
  const rules = [["Prefix match", "Each operation goes to the backend whose route matches the path.", "LuRoute"], ["Longest prefix wins", "/memories/projects/ beats /memories/.", "LuListChecks"], ["Prefix is stripped", "/memories/prefs.md is stored as key /prefs.md.", "LuScrollText"], ["Results aggregate", "ls, glob, grep merge all backends with original paths.", "LuLayers"]];
  for (let i = 0; i < 4; i++) {
    const y = 1.5 + i * 1.22;
    await iconBadge(s, 0.6, y + 0.1, 0.7, rules[i][2], i % 2 ? DARK : ORANGE);
    s.addText(rules[i][0], { x: 1.55, y, w: 5.3, h: 0.45, fontFace: HEAD, fontSize: 17, bold: true, color: DARK, margin: 0, isTextBox: true });
    s.addText(rules[i][1], { x: 1.55, y: y + 0.45, w: 5.3, h: 0.55, fontSize: 14, color: TEXT2, margin: 0, isTextBox: true });
  }
  table(s, [
    ["Agent path", "Goes to"],
    ["/draft.md", "default (StateBackend)"],
    ["/memories/prefs.md", "StoreBackend, key /prefs.md"],
    ["/memories/projects/apollo.md", "FilesystemBackend (longer prefix)"],
    ["/large_tool_results/...", "default, stays ephemeral"],
  ], 7.2, 1.5, 5.5, [2.75, 2.75], { fontSize: 13, rowH: 0.62 });
  s.addText("Default = StateBackend. Opt in to durability folder by folder.", { x: 7.2, y: 5.0, w: 5.5, h: 0.8, fontSize: 15, italic: true, color: TEXT2, margin: 0, isTextBox: true });

  s = slide("CONTENT", "Composite and ContextHub", "The Northwind assistant from notebook 4. Priya says she is in Berlin and wants three bullets. In a new thread she asks about New York travel. The agent read memories from the store, policies from disk, drafted a checklist in state. When asked to change the policy, the write was denied by a permission.");
  title(s, "Northwind assistant: where every byte went");
  const cols = [
    ["State (thread)", "/drafts/trip_checklist.md\n\nGone when the conversation ends.", "LuMemoryStick", BLUE],
    ["Store (per user)", "/memories/user_preferences.md\nnamespace (\"priya\", \"memories\")\n\nRemembered next week.", "LuDatabase", GREEN],
    ["Disk (read only)", "/docs/travel_policy.md\n/docs/expense_policy.md\n\nEdit attempt: permission denied.", "LuHardDrive", ORANGE],
  ];
  for (let i = 0; i < 3; i++) await card(s, { x: 0.6 + i * 4.1, y: 1.5, w: 3.85, h: 3.6, icon: cols[i][2], iconFill: cols[i][3], title: cols[i][0], body: cols[i][1] });
  code(s, "routes={\"/memories/\": StoreBackend(namespace=lambda rt: (rt.context.user_id, \"memories\")),\n        \"/docs/\": FilesystemBackend(root_dir=DOCS, virtual_mode=True)}", 0.6, 5.35, 12.1, 1.15, 13);

  s = slide("CONTENT", "Composite and ContextHub", "ContextHubBackend makes a LangSmith Hub repo the filesystem. The agent repo is mounted at root, linked skill repos appear under /skills. Reads are cached after a lazy pull, every write is a commit, and concurrent writers use optimistic parent commit checks, so a stale write fails and must re pull. Needs LANGSMITH_API_KEY.");
  title(s, "ContextHubBackend: a filesystem with commits");
  code(s, "/AGENTS.md                         agent repo\n/tools.json                        agent repo\n/skills/email-formatting/SKILL.md  linked skill repo\n/skills/code-review/SKILL.md       linked skill repo", 0.6, 1.5, 6.6, 2.0, 13);
  bullets(s, ["Lazy pull, then reads from an in memory cache", "Every write or edit becomes a Hub commit", "Stale parent_commit fails: re pull and retry", "First write can create the repo; UTF-8 uploads only"], 0.6, 3.8, 6.6, 2.6, 15);
  await card(s, { x: 7.6, y: 1.5, w: 5.1, h: 2.35, icon: "LuGitBranch", iconFill: ORANGE, title: "Choose Context Hub when", body: "You want commit history, and skills shared and versioned across agents, without wiring a store." });
  await card(s, { x: 7.6, y: 4.1, w: 5.1, h: 2.35, icon: "LuDatabase", iconFill: GREEN, title: "Choose StoreBackend when", body: "You run Postgres or Redis already, need per user namespaces at scale, or deploy on LangSmith." });

  // ---------- Section 5 ----------
  pres.addSection({ title: "Custom and rules" });
  s = slide("SECTION_DARK", "Custom and rules", "Notebook 5.");
  chip(s, "Notebook 05", 0.8, 1.8);
  title(s, "Build your own backend and enforce the rules");
  sub(s, "BackendProtocol, permissions, policy hooks, binary offload");

  s = slide("CONTENT", "Custom and rules", "Implement six methods, delete is optional. Return result objects with an error field, never raise for normal failures. We built a SQLite backend for a support knowledge base and tested it without an LLM. Rehearsal lesson: agents fire tool calls in parallel, so the shared connection needed a lock.");
  title(s, "BackendProtocol: six methods and two rules");
  table(s, [
    ["Method", "Job"],
    ["ls(path)", "List entries, sorted"],
    ["read(file_path, offset, limit)", "Paginated content"],
    ["write(file_path, content)", "Create or overwrite"],
    ["edit(file_path, old, new, replace_all)", "Unique find and replace"],
    ["glob(pattern, path)", "Paths by pattern"],
    ["grep(pattern, path, glob)", "Literal text search"],
    ["delete(file_path)", "Optional. Missing = tool hidden"],
  ], 0.6, 1.5, 6.9, [3.9, 3.0], { fontSize: 13, rowH: 0.56 });
  await card(s, { x: 7.9, y: 1.5, w: 4.8, h: 1.55, title: "1. Return errors, never raise", body: "ReadResult(error=\"File not found\")" , bodySize: 13 });
  await card(s, { x: 7.9, y: 3.25, w: 4.8, h: 1.55, title: "2. Need execute?", body: "Implement SandboxBackendProtocol", bodySize: 13 });
  await card(s, { x: 7.9, y: 5.0, w: 4.8, h: 1.55, icon: null, title: "Demo: SQLiteBackend at /kb/", body: "Make it thread safe: parallel tool calls", bodySize: 13, titleColor: ORANGE });

  s = slide("CONTENT", "Custom and rules", "Permissions are checked before the backend is called. Write covers write_file, edit_file and delete. First matching rule wins, so put specific exceptions first. In the HR demo, Alice's salary was denied, salary bands were allowed, policy edits denied, and memory writes paused for approval.");
  title(s, "Permissions: first matching rule wins");
  code(s, "permissions=[\n  FilesystemPermission([\"read\"], [\"/salaries/bands/**\"], mode=\"allow\"),\n  FilesystemPermission([\"read\", \"write\"], [\"/salaries/**\"], mode=\"deny\"),\n  FilesystemPermission([\"write\"], [\"/policies/**\"], mode=\"deny\"),\n  FilesystemPermission([\"write\"], [\"/memories/**\"], mode=\"interrupt\"),\n]", 0.6, 1.5, 7.3, 2.75, 13);
  table(s, [
    ["Agent tried", "Result"],
    ["read /salaries/alice.md", "Denied"],
    ["read /salaries/bands/engineering.md", "Allowed (exception first)"],
    ["edit /policies/leave.md", "Denied"],
    ["write /memories/manager.md", "Paused, then approved"],
  ], 0.6, 4.5, 7.3, [4.1, 3.2], { fontSize: 13, rowH: 0.42 });
  await card(s, { x: 8.3, y: 1.5, w: 4.4, h: 4.95, icon: "LuLock", iconFill: DARK, title: "Three modes", body: "allow: proceed\n\ndeny: tool returns permission denied\n\ninterrupt: pause for a human. Needs a checkpointer." });

  s = slide("CONTENT", "Custom and rules", "Path rules cannot express content checks, quotas or audit logs. A policy wrapper can. In the capstone, the agent did try to save a live key into the knowledge base. The wrapper blocked it and logged it. Never rely on the model alone for a security property.");
  title(s, "Policy hooks: defense in depth");
  const layers = [["Layer 1: the model", "May refuse on its own. Helpful, never a guarantee.", "LuSparkles", MID], ["Layer 2: permissions", "Declarative path rules, checked before the backend.", "LuLock", BLUE], ["Layer 3: policy wrapper", "Content inspection, rate limits, audit log, in code.", "LuShieldCheck", ORANGE]];
  for (let i = 0; i < 3; i++) await card(s, { x: 0.6 + i * 4.1, y: 1.5, w: 3.85, h: 2.5, icon: layers[i][2], iconFill: layers[i][3], title: layers[i][0], body: layers[i][1] });
  code(s, "AUDIT LOG\n13:18:52  read  /acme-debug.md   File not found\n13:18:56  write /acme-debug.md   DENIED: content looks like a secret", 0.6, 4.3, 12.1, 1.45, 14);
  s.addText("Mounted at /kb/, the wrapper sees stripped paths: deny \"/legal\", not \"/kb/legal\".", { x: 0.6, y: 5.95, w: 12.1, h: 0.5, fontSize: 14, italic: true, color: TEXT2, margin: 0, isTextBox: true });

  s = slide("CONTENT", "Custom and rules", "Binary offload keeps checkpoints small when agents read images: payloads go to blobs by sha256, history keeps references. It has no effect if blobs route to StateBackend. And migrate away from backend factory lambdas, deprecated since 0.5.0.");
  title(s, "Binary offload and migrating old code");
  await card(s, { x: 0.6, y: 1.5, w: 5.9, h: 4.95, icon: "LuImage", iconFill: BLUE, title: "offload_binary_content=True", body: "deepagents 0.7.21 or newer, opt in.\n\nImages stored once at /blobs/<sha256>, messages keep a reference, restored before each model call.\n\nDemo: read status_light.png, answered \"Green\", blob written to disk.\n\nNo effect if /blobs/ routes to StateBackend." });
  code(s, "# Before (deprecated since 0.5.0)\nbackend=lambda rt: StateBackend(rt)\nStoreBackend(namespace=lambda ctx:\n    (ctx.runtime.context.user_id,))\n\n# After\nbackend=StateBackend()\nStoreBackend(namespace=lambda rt:\n    (rt.server_info.user.identity,))", 6.8, 1.5, 5.9, 4.95, 14);

  // ---------- Section 6 ----------
  pres.addSection({ title: "Choosing" });
  s = slide("SECTION_DARK", "Choosing", "Notebook 6. The capstone.");
  chip(s, "Notebook 06", 0.8, 1.8);
  title(s, "Choosing the right backend");
  sub(s, "Five questions, twelve scenarios, one multi tenant copilot");

  s = slide("CONTENT", "Choosing", "Before you pick a backend, ask what you actually know about the data. Different folders usually give different answers. That is the signal to use a CompositeBackend.");
  title(s, "Five questions before you write code");
  const qs = [["How long must it live?", "Thread: State. Longer: Store, Hub or disk.", "LuHistory"], ["Who may see it?", "Namespace per user, org or assistant.", "LuUsers"], ["Where does it already live?", "Disk: Filesystem. DB or SaaS: custom.", "LuArchive"], ["Must the agent run code?", "Trusted: LocalShell + HITL. Else: sandbox.", "LuTerminal"], ["Who may change it?", "Permissions and policy wrappers.", "LuLock"]];
  for (let i = 0; i < 5; i++) {
    const y = 1.45 + i * 1.04;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h: 0.88, rectRadius: 0.12, fill: { color: WHITE }, line: { type: "none" }, shadow: shadow(), objectName: "question " + (i + 1) });
    await iconBadge(s, 0.8, y + 0.14, 0.6, qs[i][2], i % 2 ? DARK : ORANGE);
    s.addText(qs[i][0], { x: 1.65, y, w: 4.6, h: 0.88, fontFace: HEAD, fontSize: 17, bold: true, color: DARK, valign: "middle", margin: 0, isTextBox: true });
    s.addText(qs[i][1], { x: 6.3, y, w: 6.2, h: 0.88, fontSize: 15, color: TEXT2, valign: "middle", margin: 0, isTextBox: true });
  }

  s = slide("CONTENT", "Choosing", "Have the class answer each row before revealing the right column. The full twelve scenario table is in notebook 6.");
  title(s, "Scenario map");
  table(s, [
    ["Product", "Backend design"],
    ["Chat assistant in a web app", "StateBackend"],
    ["...that remembers the user", "Composite: State + /memories/ Store per user"],
    ["Coding CLI on a laptop", "LocalShellBackend (virtual) + HITL, behind Composite"],
    ["Data bot running user uploaded code", "Sandbox backend"],
    ["B2B support copilot, many companies", "Composite: State, per user and per org Store, read only policies"],
    ["Wiki bot over Confluence", "Custom backend at /wiki/, writes denied"],
    ["Versioned skills shared across teams", "ContextHubBackend at /hub/"],
    ["Public demo anyone can use", "StateBackend only, never disk or shell"],
  ], 0.6, 1.45, 12.1, [4.6, 7.5], { fontSize: 14, rowH: 0.57 });

  s = slide("CONTENT", "Choosing", "The capstone, Helix. Same question from Acme and Globex gave different correct answers because the policy file came from a different namespace. Sam's preference stayed private, the team note was visible to Ana, the policy edit was denied, the secret was blocked and audited.");
  title(s, "Capstone: Helix, a multi tenant support copilot");
  table(s, [
    ["Mount", "Backend", "Visible to", "Rules"],
    ["default", "StateBackend", "This conversation", "None"],
    ["/memories/", "Store (org, user, \"memories\")", "One user", "None"],
    ["/team/", "Store (org, \"team\")", "One company", "None"],
    ["/policies/", "Store (org, \"policies\")", "One company", "Write denied"],
    ["/kb/", "SQLite + audit wrapper", "Product wide", "Audited, secrets blocked"],
  ], 0.6, 1.45, 7.6, [1.4, 2.6, 1.8, 1.8], { fontSize: 13, rowH: 0.62 });
  await card(s, { x: 8.6, y: 1.45, w: 4.1, h: 2.4, icon: "LuBuilding2", iconFill: ORANGE, title: "Same question, two tenants", body: "Acme: yes, approve 300 USD.\nGlobex: no, escalate to billing." });
  await card(s, { x: 8.6, y: 4.05, w: 4.1, h: 2.4, icon: "LuShieldCheck", iconFill: GREEN, title: "Under pressure", body: "Policy edit: denied.\nLive key into KB: blocked, logged." });
  s.addText("Isolation lives in the backend, not in the prompt.", { x: 0.6, y: 5.35, w: 7.6, h: 0.6, fontFace: HEAD, fontSize: 17, bold: true, color: ORANGE, margin: 0, isTextBox: true });

  s = slide("CONTENT", "Choosing", "Use this as the go live checklist. It is also in notebook 6.");
  title(s, "Production checklist");
  const checks = [
    ["Storage", "Default route is StateBackend\nReal checkpointer and store\nExplicit namespace, tenant first\nDeployed: rt.server_info.user.identity", "LuDatabase", GREEN],
    ["Safety", "No disk or shell backends on servers\nvirtual_mode=True everywhere\nHITL on every destructive tool\nPermissions ordered specific first", "LuShieldCheck", ORANGE],
    ["Operations", "LangSmith tracing on\nCustom backends unit tested, thread safe\nBinary offload outside state\nNo deprecated factory lambdas", "LuWorkflow", BLUE],
  ];
  for (let i = 0; i < 3; i++) await card(s, { x: 0.6 + i * 4.1, y: 1.5, w: 3.85, h: 4.95, icon: checks[i][2], iconFill: checks[i][3], title: checks[i][0], body: checks[i][1], bodySize: 14 });

  // Closing
  pres.addSection({ title: "Close" });
  s = slide("TITLE_DARK", "Close", "Close with the one sentence. Then point people at the notebooks: run them top to bottom, each ends with a quiz.");
  title(s, "Tools stay the same.\nBackends decide the rest.");
  sub(s, "Where bytes live, how long they last, who can see them, and who may change them.\nRun notebooks 01 to 06, then take the quiz at the end of each.");

  await pres.writeFile({ fileName: path.join(__dirname, "..", "Deep_Agents_Backends.pptx") });
  await applyTheme(path.join(__dirname, "..", "Deep_Agents_Backends.pptx"), THEME);
  console.log("slides:", n);
}
build().catch((e) => { console.error(e); process.exit(1); });
