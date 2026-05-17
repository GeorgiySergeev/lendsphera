export type WidgetMeta = {
  label: string;
  icon: string;
  group: string;
};

export type WidgetEditorConfig = {
  meta: WidgetMeta;
};

export type WidgetRenderContext = {
  env: "development" | "production";
  locale?: string;
};

export type SchemaLike<TProps> = {
  parse: (input: unknown) => TProps;
  safeParse: (
    input: unknown
  ) =>
    | { success: true; data: TProps }
    | { success: false; error: { issues: Array<{ path: PropertyKey[] }> } };
};

export type WidgetDefinition<TKind extends string, TProps> = {
  kind: TKind;
  schema: SchemaLike<TProps>;
  render: (props: TProps, ctx: WidgetRenderContext) => string;
  editor: WidgetEditorConfig;
};

export type RegisteredWidget<
  TKind extends string = string,
  TProps = unknown
> = WidgetDefinition<TKind, TProps> & {
  parse: (input: unknown) => TProps;
  meta: WidgetMeta;
};

export function defineWidget<TKind extends string, TProps>(
  definition: WidgetDefinition<TKind, TProps>
): RegisteredWidget<TKind, TProps> {
  const parse = (input: unknown) => definition.schema.parse(input);

  return {
    ...definition,
    parse,
    meta: definition.editor.meta
  };
}
