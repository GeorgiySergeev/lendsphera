import { runWidgetVisualSuite } from "./helpers";
runWidgetVisualSuite({
  widget: "hero",
  variants: [
    { name: "default", storyId: "widgets-hero--default" },
    { name: "promo", storyId: "widgets-hero--promo" },
    { name: "compact", storyId: "widgets-hero--compact" }
  ]
});
