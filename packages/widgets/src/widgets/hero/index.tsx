import { defineWidget } from "../../contract";

import { heroPropsSchema } from "./props";

export const heroWidget = defineWidget({
  kind: "hero",
  schema: heroPropsSchema,
  editor: {
    meta: {
      label: "Hero",
      icon: "panel-top",
      group: "Layout"
    }
  },
  render: (props) =>
    `<section class="lsw-hero"><p class="lsw-hero__subtitle">${props.subtitle}</p><h1 class="lsw-hero__title">${props.title}</h1><a class="lsw-hero__cta" href="${props.ctaUrl}">${props.ctaLabel}</a></section>`
});
