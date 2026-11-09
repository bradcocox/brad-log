/**
 * Make Markdown tables usable at a reading width and on small screens.
 * Both views are built from the same HAST cells. No HTML strings are injected.
 */
const element = (tagName, properties = {}, children = []) => ({
  type: "element",
  tagName,
  properties,
  children,
});
const text = value => ({ type: "text", value });
const isElement = (node, tag) =>
  node?.type === "element" && (!tag || node.tagName === tag);
const elements = node =>
  (node.children ?? []).filter(child => isElement(child));
const nodeText = node =>
  node.type === "text"
    ? node.value
    : (node.children ?? []).map(nodeText).join("");
const labelText = node => nodeText(node).replace(/\s+/g, " ").trim();

/** Copies content, never IDs or relationships belonging to the original table. */
const copyContent = node => {
  const copy = { ...node };
  if (node.properties) {
    copy.properties = { ...node.properties };
    for (const name of [
      "id",
      "headers",
      "ariaLabelledBy",
      "ariaDescribedBy",
      "aria-labelledby",
      "aria-describedby",
    ]) {
      delete copy.properties[name];
    }
  }
  if (node.children) copy.children = node.children.map(copyContent);
  return copy;
};

const hasComplexCells = node => {
  // Raw HTML and MDX may contain IDs/interactive markup not represented as HAST
  // properties yet. Keep those cells in their original table, without cloning.
  if (node.type === "raw" || node.type?.startsWith("mdx")) return true;
  if ((node.children ?? []).some(child => isElement(child, "table")))
    return true;
  if (isElement(node)) {
    const props = node.properties ?? {};
    if (
      Number(props.colSpan ?? props.colspan ?? 1) !== 1 ||
      Number(props.rowSpan ?? props.rowspan ?? 1) !== 1
    )
      return true;
  }
  return (node.children ?? []).some(hasComplexCells);
};

function describeTable(table) {
  const children = elements(table);
  const head = children.find(child => child.tagName === "thead");
  const heads = head
    ? elements(head).filter(child => child.tagName === "tr")
    : [];
  const bodies = children.filter(child => child.tagName === "tbody");
  const rows = bodies.flatMap(body =>
    elements(body).filter(child => child.tagName === "tr")
  );
  const headers = heads.length === 1 ? elements(heads[0]) : [];
  const columns =
    headers.length || Math.max(1, ...rows.map(row => elements(row).length));
  const simple =
    heads.length === 1 &&
    headers.length >= 2 &&
    headers.every(cell => cell.tagName === "th" && labelText(cell)) &&
    bodies.length === 1 &&
    rows.length > 0 &&
    !children.some(child => ["tfoot", "colgroup"].includes(child.tagName)) &&
    !hasComplexCells(table) &&
    !rows.some(row => elements(row).length !== headers.length) &&
    !rows.some(row =>
      elements(row).some(cell => !["td", "th"].includes(cell.tagName))
    );
  return { headers, rows, columns, simple };
}

function addColumnWidths(table, columns) {
  const ratios =
    {
      2: [50, 50],
      3: [26, 42, 32],
      4: [22, 24, 24, 30],
      5: [22, 18, 14, 24, 22],
    }[columns] ?? Array.from({ length: columns }, () => 100 / columns);
  const group = element(
    "colgroup",
    {},
    ratios.map(width => element("col", { style: `width: ${width}%` }))
  );
  const caption = table.children.findIndex(child =>
    isElement(child, "caption")
  );
  table.children.splice(caption >= 0 ? caption + 1 : 0, 0, group);
}

function makeRecords(headers, rows, id, headingDepth) {
  return element(
    "div",
    {
      id: `${id}-records`,
      className: ["table-records-panel"],
      "data-table-records-panel": "",
      "data-pagefind-ignore": "",
    },
    [
      element(
        "ol",
        { className: ["table-records"] },
        rows.map((row, index) => {
          const cells = elements(row);
          const titleId = `${id}-record-${index + 1}`;
          const titleContent = labelText(cells[0])
            ? (cells[0].children ?? []).map(copyContent)
            : [text(`第 ${index + 1} 筆`)];
          return element(
            "li",
            { className: ["table-record"], "aria-labelledby": titleId },
            [
              element(
                "p",
                { className: ["table-record-label"] },
                (headers[0].children ?? []).map(copyContent)
              ),
              element(
                "div",
                {
                  id: titleId,
                  className: ["table-record-title"],
                  role: "heading",
                  "aria-level": Math.min(6, headingDepth + 1),
                },
                titleContent
              ),
              element(
                "dl",
                { className: ["table-record-fields"] },
                cells
                  .slice(1)
                  .map((cell, fieldIndex) =>
                    element("div", { className: ["table-record-field"] }, [
                      element(
                        "dt",
                        {},
                        (headers[fieldIndex + 1].children ?? []).map(
                          copyContent
                        )
                      ),
                      element("dd", {}, (cell.children ?? []).map(copyContent)),
                    ])
                  )
              ),
            ]
          );
        })
      ),
    ]
  );
}

export const rehypeTableWrapper = () => tree => {
  let count = 0;
  let heading = { title: "資料表", depth: 2 };
  // Reserve authored IDs as well as generated ones.
  const usedIds = new Set();
  const collectIds = node => {
    if (node.properties?.id) usedIds.add(String(node.properties.id));
    if (node.type === "raw") {
      for (const match of node.value.matchAll(
        /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
      )) {
        usedIds.add(match[1] ?? match[2] ?? match[3]);
      }
    }
    for (const child of node.children ?? []) collectIds(child);
  };
  collectIds(tree);
  const makeId = () => {
    let id;
    do {
      id = `article-table-${++count}`;
    } while (
      [...usedIds].some(value => value === id || value.startsWith(`${id}-`))
    );
    usedIds.add(id);
    return id;
  };

  const wrap = node => {
    if (!node.children) return;
    if (node.type === "mdxJsxFlowElement" && node.name === "ResponsiveTable")
      return;

    node.children = node.children.map(child => {
      if (isElement(child) && /^h[1-6]$/.test(child.tagName)) {
        heading = {
          title: labelText(child) || "資料表",
          depth: Number(child.tagName[1]),
        };
      }
      // Astro parses author-written HTML after custom rehype transforms. Wrap
      // an intact HTML table node as-is; never parse or clone its HTML string.
      const rawTable =
        child.type === "raw" &&
        /^\s*<table(?:\s|>)[\s\S]*<\/table>\s*$/i.test(child.value);
      if (!isElement(child, "table") && !rawTable) {
        wrap(child);
        return child;
      }

      const id = makeId();
      const info = rawTable
        ? { headers: [], rows: [], columns: 3, simple: false }
        : describeTable(child);
      const caption = elements(child).find(item => item.tagName === "caption");
      const title = (caption && labelText(caption)) || heading.title;
      const minWidth =
        info.columns <= 2
          ? 32
          : info.columns === 3
            ? 48
            : info.columns === 4
              ? 56
              : 64 + (info.columns - 5) * 10;
      if (!rawTable) {
        child.properties = {
          ...child.properties,
          "aria-labelledby": `${id}-title`,
        };
      }
      if (info.simple) {
        addColumnWidths(child, info.columns);
        info.headers.forEach(cell => {
          cell.properties = { ...cell.properties, scope: "col" };
        });
        info.rows.forEach(row => {
          const first = elements(row)[0];
          first.tagName = "th";
          first.properties = { ...first.properties, scope: "row" };
        });
      }

      const switcher = info.simple
        ? [
            element(
              "div",
              {
                className: ["table-view-switch"],
                "data-table-switch": "",
                role: "group",
                "aria-label": "閱讀方式",
                hidden: true,
              },
              [
                element(
                  "button",
                  {
                    type: "button",
                    "data-table-mode": "table",
                    "aria-controls": `${id}-panel`,
                    "aria-pressed": "false",
                  },
                  [text("表格對照")]
                ),
                element(
                  "button",
                  {
                    type: "button",
                    "data-table-mode": "records",
                    "aria-controls": `${id}-records`,
                    "aria-pressed": "false",
                  },
                  [text("逐項閱讀")]
                ),
              ]
            ),
          ]
        : [];

      return element(
        "section",
        {
          className: ["article-table"],
          "data-article-table": "",
          "data-has-records": String(info.simple),
          "data-columns": info.columns,
          "data-simple-table": String(info.simple),
          "aria-labelledby": `${id}-title`,
          style: `--table-min-width: ${minWidth}rem`,
        },
        [
          element(
            "header",
            { className: ["article-table-header"], "data-pagefind-ignore": "" },
            [
              element(
                "p",
                { id: `${id}-title`, className: ["article-table-title"] },
                [text(title)]
              ),
              ...switcher,
            ]
          ),
          element(
            "div",
            {
              id: `${id}-panel`,
              className: ["article-table-panel"],
              "data-table-panel": "",
            },
            [
              element(
                "div",
                { className: ["table-scroll-bar"], "data-pagefind-ignore": "" },
                [
                  element(
                    "p",
                    {
                      id: `${id}-hint`,
                      className: ["table-scroll-hint"],
                      "data-table-hint": "",
                    },
                    [text("表格可左右捲動；聚焦表格後，也可使用 ← → 方向鍵。")]
                  ),
                  element(
                    "div",
                    {
                      className: ["table-scroll-controls"],
                      "data-table-scroll-controls": "",
                      hidden: true,
                    },
                    [
                      element(
                        "button",
                        {
                          type: "button",
                          "data-table-scroll": "left",
                          "aria-label": "往左捲動表格",
                          "aria-controls": `${id}-scroll`,
                        },
                        [text("← 向左")]
                      ),
                      element(
                        "span",
                        {
                          className: ["table-scroll-position"],
                          "data-table-position": "",
                          "aria-label": "表格水平位置",
                        },
                        [text("最左側")]
                      ),
                      element(
                        "button",
                        {
                          type: "button",
                          "data-table-scroll": "right",
                          "aria-label": "往右捲動表格",
                          "aria-controls": `${id}-scroll`,
                        },
                        [text("向右 →")]
                      ),
                    ]
                  ),
                ]
              ),
              element(
                "div",
                {
                  id: `${id}-scroll`,
                  className: ["table-wrapper"],
                  tabIndex: 0,
                  role: "region",
                  "aria-labelledby": `${id}-title`,
                  "aria-describedby": `${id}-hint`,
                },
                [child]
              ),
            ]
          ),
          ...(info.simple
            ? [makeRecords(info.headers, info.rows, id, heading.depth)]
            : []),
        ]
      );
    });
  };
  wrap(tree);
};
