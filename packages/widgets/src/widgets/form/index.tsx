import { defineWidget } from "../../contract";

import { formPropsSchema } from "./props";

export const formWidget = defineWidget({
  kind: "form",
  schema: formPropsSchema,
  editor: {
    meta: {
      label: "Form",
      icon: "clipboard-list",
      group: "Conversion"
    }
  },
  render: (props) =>
    `<section class="lsw-form"><h2>${props.title}</h2><form>${props.fields.map((field) => `<label>${field}<input name="${field}" /></label>`).join("")}<label><input type="checkbox" />${props.consentLabel}</label><button type="submit">${props.buttonLabel}</button></form></section>`
});
