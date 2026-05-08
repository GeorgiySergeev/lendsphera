import type { LandingWidget, WidgetSchema } from "./sdk";

type CountdownTimerProps = {
  accentColor?: string;
  expiredText?: string;
  label?: string;
  targetDate?: string;
};

type CountdownState = {
  intervalId: number;
};

const state = new WeakMap<HTMLElement, CountdownState>();

const countdownTimerSchema: WidgetSchema = {
  fields: [
    { defaultValue: "Offer ends in", key: "label", label: "Label", type: "text" },
    {
      defaultValue: new Date(Date.now() + 86400000).toISOString(),
      key: "targetDate",
      label: "Target date",
      required: true,
      type: "date"
    },
    {
      defaultValue: "Offer expired",
      key: "expiredText",
      label: "Expired text",
      type: "text"
    },
    { defaultValue: "#2563eb", key: "accentColor", label: "Accent color", type: "color" }
  ]
};

const CountdownTimer: LandingWidget<CountdownTimerProps> = {
  mount({ props, root }) {
    const label = props.label || "Offer ends in";
    const expiredText = props.expiredText || "Offer expired";
    const accentColor = props.accentColor || "#2563eb";
    const targetTime = parseTargetTime(props.targetDate);
    const wrapper = document.createElement("div");
    const heading = document.createElement("p");
    const timer = document.createElement("div");

    wrapper.className = "lb-widget lb-countdown-timer";
    heading.textContent = label;
    timer.setAttribute("aria-live", "polite");
    timer.style.color = accentColor;
    timer.style.fontWeight = "700";
    timer.style.fontSize = "clamp(1.75rem, 4vw, 3rem)";
    wrapper.append(heading, timer);
    root.replaceChildren(wrapper);

    const render = () => {
      const remaining = targetTime - Date.now();

      if (remaining <= 0) {
        timer.textContent = expiredText;
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      timer.textContent = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    };

    render();
    const intervalId = window.setInterval(render, 1000);
    state.set(root, { intervalId });
  },
  schema: countdownTimerSchema,
  unmount({ root }) {
    const current = state.get(root);

    if (current) {
      window.clearInterval(current.intervalId);
    }

    state.delete(root);
    root.replaceChildren();
  }
};

function parseTargetTime(value: unknown) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : Date.now() + 86400000;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export { CountdownTimer, countdownTimerSchema };
export default CountdownTimer;
