import { runWidgetVisualSuite } from "./helpers";
runWidgetVisualSuite({
  widget: "form",
  variants: [
    { name: "default", storyId: "widgets-form--default" },
    { name: "extended", storyId: "widgets-form--extended" },
    { name: "minimal", storyId: "widgets-form--minimal" }
  ]
});
