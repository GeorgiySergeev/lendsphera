import type { ComponentDetail, ComponentListItem, ComponentVariant } from "@workspace/types";

type PreviewSource = Pick<
  ComponentListItem | ComponentDetail,
  "html" | "previewBg" | "previewDark"
> & {
  css?: string;
};

function buildPreviewHtml(component: PreviewSource, variant?: ComponentVariant | null) {
  const body = variant?.html ?? component.html;
  const css = variant?.css ?? component.css ?? "";
  const bg = component.previewBg ?? (component.previewDark ? "#030712" : "#f9fafb");

  return `<!DOCTYPE html>
<html class="${component.previewDark ? "dark" : ""}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body{margin:0;background:${bg};}
    *{box-sizing:border-box;}
    ${css}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function buildCardPreviewHtml(component: ComponentListItem) {
  return buildPreviewHtml(component).replace(
    "</style>",
    "*{pointer-events:none!important;}</style>"
  );
}

export { buildCardPreviewHtml, buildPreviewHtml };
