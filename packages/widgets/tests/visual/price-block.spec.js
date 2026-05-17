import { runWidgetVisualSuite } from "./helpers";
runWidgetVisualSuite({
  widget: "price-block",
  variants: [
    { name: "default", storyId: "widgets-price-block--default" },
    { name: "discount", storyId: "widgets-price-block--discount" },
    { name: "premium", storyId: "widgets-price-block--premium" }
  ]
});
