declare module "html-minifier-terser" {
  export function minify(
    value: string,
    options?: Record<string, unknown>
  ): Promise<string>;
}
