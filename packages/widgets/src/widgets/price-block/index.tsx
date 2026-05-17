import { defineWidget } from "../../contract";

import { priceBlockPropsSchema } from "./props";

export const priceBlockWidget = defineWidget({
  kind: "price-block",
  schema: priceBlockPropsSchema,
  editor: {
    meta: {
      label: "Price Block",
      icon: "badge-dollar-sign",
      group: "Conversion"
    }
  },
  render: (props) =>
    `<section class="lsw-price"><h2>${props.title}</h2><p class="lsw-price__main">${props.currency}${props.price}</p><p class="lsw-price__old">${props.currency}${props.oldPrice}</p><ul>${props.features.map((item) => `<li>${item}</li>`).join("")}</ul></section>`
});
