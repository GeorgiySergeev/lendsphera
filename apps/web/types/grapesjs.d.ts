declare module "grapesjs" {
  export type Editor = {
    AssetManager: {
      add: (assets: unknown[]) => void;
      getAll: () => { toJSON: () => unknown[] };
    };
    BlockManager: {
      add: (
        id: string,
        block: { category?: string; content: string; label: string }
      ) => void;
    };
    destroy: () => void;
    getComponents: () => { toJSON: () => unknown };
    getCss: () => string | undefined;
    getHtml: () => string;
    getStyle: () => unknown;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    setComponents: (components: unknown) => void;
    setDevice: (device: string) => void;
    setStyle: (styles: unknown) => void;
  };

  type Plugin = (editor: Editor, options?: Record<string, unknown>) => void;

  type InitConfig = {
    assetManager?: Record<string, unknown>;
    blockManager?: Record<string, unknown>;
    canvas?: Record<string, unknown>;
    container: string;
    deviceManager?: Record<string, unknown>;
    fromElement?: boolean;
    height?: string;
    layerManager?: Record<string, unknown>;
    panels?: Record<string, unknown>;
    plugins?: Plugin[];
    selectorManager?: Record<string, unknown>;
    storageManager?: boolean | Record<string, unknown>;
    styleManager?: Record<string, unknown>;
    traitManager?: Record<string, unknown>;
    width?: string;
  };

  const grapesjs: {
    init: (config: InitConfig) => Editor;
  };

  export default grapesjs;
}
