const config = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {}
  }
};
export default config;
