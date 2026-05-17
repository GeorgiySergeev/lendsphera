import { runWidgetVisualSuite } from "./helpers";
runWidgetVisualSuite({
  widget: "wheel",
  variants: [
    { name: "default", storyId: "widgets-wheel--default" },
    { name: "high-prize", storyId: "widgets-wheel--high-prize" },
    { name: "seasonal", storyId: "widgets-wheel--seasonal" }
  ]
});
