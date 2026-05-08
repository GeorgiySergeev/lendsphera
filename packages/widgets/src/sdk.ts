type WidgetFieldType =
  | "text"
  | "textarea"
  | "number"
  | "color"
  | "select"
  | "boolean"
  | "date"
  | "array";

type WidgetFieldOption = {
  label: string;
  value: string;
};

type WidgetSchemaField = {
  defaultValue?: unknown;
  helpText?: string;
  key: string;
  label: string;
  max?: number;
  min?: number;
  options?: WidgetFieldOption[];
  required?: boolean;
  type: WidgetFieldType;
};

type WidgetSchema = {
  fields: WidgetSchemaField[];
};

type WidgetEventName = "win" | "lose" | string;

type WidgetEventPayload = Record<string, unknown>;

type WidgetMountContext<
  TProps extends Record<string, unknown> = Record<string, unknown>
> = {
  emit: (name: WidgetEventName, payload?: WidgetEventPayload) => void;
  props: TProps;
  root: HTMLElement;
};

type LandingWidget<TProps extends Record<string, unknown> = Record<string, unknown>> = {
  mount: (context: WidgetMountContext<TProps>) => void | Promise<void>;
  schema: WidgetSchema;
  unmount: (context: WidgetMountContext<TProps>) => void;
};

type WidgetManifestItem = {
  bundle: string;
  hash: string;
  schema: WidgetSchema;
  slug: string;
  version: string;
};

function createWidgetEventEmitter(root: HTMLElement) {
  return (name: WidgetEventName, payload: WidgetEventPayload = {}) => {
    root.dispatchEvent(
      new CustomEvent(`widget:${name}`, {
        bubbles: true,
        detail: payload
      })
    );
  };
}

function parseWidgetProps(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function serializeWidgetProps(props: Record<string, unknown>) {
  return JSON.stringify(props).replaceAll("<", "\\u003c");
}

function buildDefaultProps(schema: WidgetSchema) {
  return schema.fields.reduce<Record<string, unknown>>((props, field) => {
    if (field.defaultValue !== undefined) {
      props[field.key] = field.defaultValue;
    }

    return props;
  }, {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export {
  buildDefaultProps,
  createWidgetEventEmitter,
  parseWidgetProps,
  serializeWidgetProps,
  type LandingWidget,
  type WidgetEventName,
  type WidgetEventPayload,
  type WidgetManifestItem,
  type WidgetMountContext,
  type WidgetSchema,
  type WidgetSchemaField
};
