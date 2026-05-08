import type { LandingWidget, WidgetSchema } from "./sdk";

type ExitIntentPopupProps = {
  body?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  delayMs?: number;
  oncePerSession?: boolean;
  title?: string;
};

type ExitIntentState = {
  onMouseLeave: (event: MouseEvent) => void;
  onTouchMove: () => void;
  timeoutId: number;
};

const sessionKey = "lb-exit-intent-popup-seen";
const state = new WeakMap<HTMLElement, ExitIntentState>();

const exitIntentPopupSchema: WidgetSchema = {
  fields: [
    { defaultValue: "Wait before you go", key: "title", label: "Title", type: "text" },
    {
      defaultValue: "Claim your bonus before leaving this page.",
      key: "body",
      label: "Body",
      type: "textarea"
    },
    {
      defaultValue: "Claim bonus",
      key: "buttonLabel",
      label: "Button label",
      type: "text"
    },
    { defaultValue: "#", key: "buttonUrl", label: "Button URL", type: "text" },
    { defaultValue: 1200, key: "delayMs", label: "Mobile delay", min: 0, type: "number" },
    {
      defaultValue: true,
      key: "oncePerSession",
      label: "Once per session",
      type: "boolean"
    }
  ]
};

const ExitIntentPopup: LandingWidget<ExitIntentPopupProps> = {
  mount({ emit, props, root }) {
    const oncePerSession = props.oncePerSession !== false;

    if (oncePerSession && window.sessionStorage.getItem(sessionKey) === "1") {
      return;
    }

    let opened = false;
    const open = () => {
      if (opened) {
        return;
      }

      opened = true;
      window.sessionStorage.setItem(sessionKey, "1");
      renderPopup(root, props, () => {
        root.replaceChildren();
        emit("lose", { action: "dismiss", widget: "exit-intent-popup" });
      });
      emit("win", { action: "open", widget: "exit-intent-popup" });
    };
    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        open();
      }
    };
    const onTouchMove = () => open();
    const timeoutId = window.setTimeout(() => {
      window.addEventListener("touchmove", onTouchMove, { once: true, passive: true });
    }, normalizeDelay(props.delayMs));

    document.addEventListener("mouseleave", onMouseLeave);
    state.set(root, { onMouseLeave, onTouchMove, timeoutId });
  },
  schema: exitIntentPopupSchema,
  unmount({ root }) {
    const current = state.get(root);

    if (current) {
      document.removeEventListener("mouseleave", current.onMouseLeave);
      window.removeEventListener("touchmove", current.onTouchMove);
      window.clearTimeout(current.timeoutId);
    }

    state.delete(root);
    root.replaceChildren();
  }
};

function renderPopup(
  root: HTMLElement,
  props: ExitIntentPopupProps,
  onClose: () => void
) {
  const overlay = document.createElement("div");
  const dialog = document.createElement("div");
  const title = document.createElement("h2");
  const body = document.createElement("p");
  const actions = document.createElement("div");
  const link = document.createElement("a");
  const close = document.createElement("button");

  overlay.className = "lb-widget lb-exit-intent-popup";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(15,23,42,.58);padding:24px";
  dialog.style.cssText =
    "max-width:420px;border-radius:24px;background:white;padding:28px;box-shadow:0 24px 80px rgba(15,23,42,.28);color:#0f172a";
  title.textContent = props.title || "Wait before you go";
  body.textContent = props.body || "Claim your bonus before leaving this page.";
  actions.style.cssText = "display:flex;gap:12px;align-items:center;margin-top:20px";
  link.href = props.buttonUrl || "#";
  link.textContent = props.buttonLabel || "Claim bonus";
  link.style.cssText =
    "border-radius:999px;background:#2563eb;color:white;padding:10px 16px;text-decoration:none;font-weight:700";
  close.type = "button";
  close.textContent = "Close";
  close.addEventListener("click", onClose);
  actions.append(link, close);
  dialog.append(title, body, actions);
  overlay.append(dialog);
  root.replaceChildren(overlay);
}

function normalizeDelay(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 1200;
}

export { ExitIntentPopup, exitIntentPopupSchema };
export default ExitIntentPopup;
