import postcss, { type Plugin, type Rule } from "postcss";

type CustomCssResult = {
  css: string;
  error: string | null;
};

const landingRootSelector = ".landing-root";

async function processCustomCss(css: string): Promise<CustomCssResult> {
  if (!css.trim()) {
    return { css: "", error: null };
  }

  try {
    const result = await postcss([scopeLandingCssPlugin()]).process(css, {
      from: undefined
    });

    return { css: result.css, error: null };
  } catch (error) {
    return { css: "", error: error instanceof Error ? error.message : "Invalid CSS" };
  }
}

function scopeLandingCss(css: string) {
  return processCustomCss(css);
}

function scopeLandingCssPlugin(): Plugin {
  return {
    postcssPlugin: "scope-landing-css",
    Rule(rule: Rule) {
      if (!rule.selector || isKeyframeRule(rule)) {
        return;
      }

      rule.selectors = rule.selectors.map(scopeSelector);
    }
  };
}

function scopeSelector(selector: string) {
  const trimmed = selector.trim();

  if (!trimmed || trimmed.startsWith(landingRootSelector)) {
    return selector;
  }

  if (trimmed === ":root") {
    return landingRootSelector;
  }

  if (trimmed.startsWith("html") || trimmed.startsWith("body")) {
    return trimmed.replace(/^(html|body)/, landingRootSelector);
  }

  return `${landingRootSelector} ${selector}`;
}

function isKeyframeRule(rule: Rule) {
  return rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name);
}

function ensureLandingRoot(html: string) {
  if (!html.trim()) {
    return html;
  }

  if (/class=["'][^"']*\blanding-root\b/.test(html)) {
    return html;
  }

  return `<div class="landing-root">${html}</div>`;
}

export { ensureLandingRoot, landingRootSelector, processCustomCss, scopeLandingCss };
export type { CustomCssResult };
