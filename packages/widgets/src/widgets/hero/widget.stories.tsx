import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { heroWidget } from "./index";

const meta: Meta = { title: "Widgets/Hero" };

export default meta;

type Story = StoryObj;

function render(args: Record<string, unknown>) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: heroWidget.render(heroWidget.schema.parse(args), { env: "development" })
      }}
    />
  );
}

export const Default: Story = { render: () => render({}) };
export const Promo: Story = {
  render: () =>
    render({ title: "Spring sale", subtitle: "Limited offer", ctaLabel: "Claim" })
};
export const Compact: Story = {
  render: () =>
    render({
      title: "Fast launch",
      subtitle: "Widget-ready",
      ctaLabel: "Go",
      ctaUrl: "#"
    })
};
