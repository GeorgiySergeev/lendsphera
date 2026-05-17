import { runWidgetVisualSuite } from "./helpers";
runWidgetVisualSuite({
  widget: "testimonials",
  variants: [
    { name: "default", storyId: "widgets-testimonials--default" },
    { name: "with-avatars", storyId: "widgets-testimonials--with-avatars" },
    { name: "single", storyId: "widgets-testimonials--single" }
  ]
});
