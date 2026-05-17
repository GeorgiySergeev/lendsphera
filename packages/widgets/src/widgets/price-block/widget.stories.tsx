import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { priceBlockWidget } from "./index";

const meta: Meta = { title: "Widgets/Price Block" };

export default meta;

type Story = StoryObj;

function render(args: Record<string, unknown>) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: priceBlockWidget.render(priceBlockWidget.schema.parse(args), {
          env: "development"
        })
      }}
    />
  );
}

export const Default: Story = { render: () => render({}) };
export const Discount: Story = {
  render: () => render({ oldPrice: 299, price: 119, title: "Flash deal" })
};
export const Premium: Story = {
  render: () => render({ price: 399, oldPrice: 499, currency: "$", title: "Premium" })
};
