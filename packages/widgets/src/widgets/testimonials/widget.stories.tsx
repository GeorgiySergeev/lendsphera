import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { testimonialsWidget } from "./index";

const meta: Meta = { title: "Widgets/Testimonials" };

export default meta;

type Story = StoryObj;

function render(args: Record<string, unknown>) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: testimonialsWidget.render(testimonialsWidget.schema.parse(args), {
          env: "development"
        })
      }}
    />
  );
}

export const Default: Story = { render: () => render({}) };
export const WithAvatars: Story = {
  render: () =>
    render({
      items: [
        { author: "Mila", quote: "Solid growth in leads." },
        { author: "Ihor", quote: "Smooth rollout." }
      ]
    })
};
export const Single: Story = {
  render: () => render({ items: [{ author: "Team", quote: "One strong review." }] })
};
