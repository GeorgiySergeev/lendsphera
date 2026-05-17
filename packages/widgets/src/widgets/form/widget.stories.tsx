import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { formWidget } from "./index";

const meta: Meta = { title: "Widgets/Form" };

export default meta;

type Story = StoryObj;

function render(args: Record<string, unknown>) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: formWidget.render(formWidget.schema.parse(args), { env: "development" })
      }}
    />
  );
}

export const Default: Story = { render: () => render({}) };
export const Extended: Story = {
  render: () => render({ fields: ["name", "phone", "email", "message"] })
};
export const Minimal: Story = {
  render: () => render({ title: "Contact us", fields: ["phone"], buttonLabel: "Call me" })
};
