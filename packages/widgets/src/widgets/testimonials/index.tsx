import { defineWidget } from "../../contract";

import { testimonialsPropsSchema } from "./props";

export const testimonialsWidget = defineWidget({
  kind: "testimonials",
  schema: testimonialsPropsSchema,
  editor: {
    meta: {
      label: "Testimonials",
      icon: "messages-square",
      group: "Social proof"
    }
  },
  render: (props) =>
    `<section class="lsw-testimonials"><h2>${props.title}</h2>${props.items.map((item) => `<blockquote><p>${item.quote}</p><footer>${item.author}</footer></blockquote>`).join("")}</section>`
});
