declare module "grapesjs-preset-webpage" {
  import type { Editor } from "grapesjs";

  type PluginOptions = Record<string, unknown>;
  type Plugin = (editor: Editor, options?: PluginOptions) => void;

  const plugin: Plugin;
  export default plugin;
}

declare module "grapesjs-blocks-basic" {
  import type { Editor } from "grapesjs";

  type PluginOptions = Record<string, unknown>;
  type Plugin = (editor: Editor, options?: PluginOptions) => void;

  const plugin: Plugin;
  export default plugin;
}
