import { defineWidget } from "../../contract";

import { wheelPropsSchema } from "./props";

export const wheelWidget = defineWidget({
  kind: "wheel",
  schema: wheelPropsSchema,
  editor: {
    meta: {
      label: "Wheel",
      icon: "circle-dot",
      group: "Gamification"
    }
  },
  render: (props) =>
    `<section class="lsw-wheel"><h2>${props.title}</h2><div class="lsw-wheel__segments">${props.segments.map((segment) => `<span>${segment.label}</span>`).join("")}</div><button>${props.buttonLabel}</button></section>`
});
