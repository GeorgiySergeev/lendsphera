import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "light",
      values: [{ name: "light", value: "#ffffff" }]
    },
    layout: "fullscreen"
  }
};

export default preview;
