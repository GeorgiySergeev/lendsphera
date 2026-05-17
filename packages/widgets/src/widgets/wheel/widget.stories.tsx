import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { wheelWidget } from "./index";

const meta: Meta = { title: "Widgets/Wheel" };

export default meta;

type Story = StoryObj;

function render(args: Record<string, unknown>) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: wheelWidget.render(wheelWidget.schema.parse(args), { env: "development" })
      }}
    />
  );
}

export const Default: Story = { render: () => render({}) };
export const HighPrize: Story = {
  render: () =>
    render({
      segments: [
        { label: "50%", value: "50" },
        { label: "70%", value: "70" }
      ]
    })
};
export const Seasonal: Story = {
  render: () => render({ title: "Holiday spin", buttonLabel: "Spin now" })
};
