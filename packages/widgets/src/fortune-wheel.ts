import type { LandingWidget, WidgetSchema } from "./sdk";

type WheelPrize = {
  color: string;
  label: string;
  outcome: "win" | "lose";
  probability: number;
};

type FortuneWheelProps = {
  buttonLabel?: string;
  prizes?: WheelPrize[];
  size?: number;
  title?: string;
};

type FortuneWheelState = {
  button: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  spinning: boolean;
};

const defaultPrizes: WheelPrize[] = [
  { color: "#2563eb", label: "10% OFF", outcome: "win", probability: 35 },
  { color: "#f97316", label: "Try again", outcome: "lose", probability: 30 },
  { color: "#16a34a", label: "Free shipping", outcome: "win", probability: 20 },
  { color: "#7c3aed", label: "Bonus gift", outcome: "win", probability: 15 }
];

const state = new WeakMap<HTMLElement, FortuneWheelState>();

const fortuneWheelSchema: WidgetSchema = {
  fields: [
    { defaultValue: "Spin & win", key: "title", label: "Title", type: "text" },
    { defaultValue: "Spin", key: "buttonLabel", label: "Button label", type: "text" },
    {
      defaultValue: 320,
      key: "size",
      label: "Canvas size",
      max: 520,
      min: 240,
      type: "number"
    },
    {
      defaultValue: defaultPrizes,
      helpText: "4-12 prizes with label, color, probability, outcome",
      key: "prizes",
      label: "Prizes",
      type: "array"
    }
  ]
};

const FortuneWheel: LandingWidget<FortuneWheelProps> = {
  mount({ emit, props, root }) {
    const prizes = normalizePrizes(props.prizes);
    const size = normalizeSize(props.size);
    const title = props.title || "Spin & win";
    const buttonLabel = props.buttonLabel || "Spin";
    const wrapper = document.createElement("div");
    const heading = document.createElement("h2");
    const canvas = document.createElement("canvas");
    const button = document.createElement("button");

    wrapper.className = "lb-widget lb-fortune-wheel";
    heading.textContent = title;
    canvas.width = size;
    canvas.height = size;
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    button.type = "button";
    button.textContent = buttonLabel;
    button.setAttribute("aria-label", buttonLabel);

    wrapper.append(heading, canvas, button);
    root.replaceChildren(wrapper);

    const wheelState: FortuneWheelState = { button, canvas, spinning: false };
    state.set(root, wheelState);
    drawWheel(canvas, prizes, 0);

    button.addEventListener("click", () => {
      const currentState = state.get(root);

      if (!currentState || currentState.spinning) {
        return;
      }

      currentState.spinning = true;
      button.disabled = true;

      const result = pickPrize(prizes);
      const resultIndex = prizes.indexOf(result);
      const segmentAngle = (Math.PI * 2) / prizes.length;
      const targetRotation =
        Math.PI * 8 + (Math.PI * 1.5 - (resultIndex + 0.5) * segmentAngle);
      const start = performance.now();
      const duration = 2400;
      const activeState = currentState;

      function animate(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        drawWheel(canvas, prizes, eased * targetRotation);

        if (progress < 1) {
          requestAnimationFrame(animate);
          return;
        }

        activeState.spinning = false;
        activeState.button.disabled = false;
        emit(result.outcome, { prize: result.label, widget: "fortune-wheel" });
      }

      requestAnimationFrame(animate);
    });
  },
  schema: fortuneWheelSchema,
  unmount({ root }) {
    state.delete(root);
    root.replaceChildren();
  }
};

function normalizePrizes(prizes: FortuneWheelProps["prizes"]) {
  const source = Array.isArray(prizes) ? prizes : defaultPrizes;
  const normalized: WheelPrize[] = source
    .filter((prize) => prize && typeof prize.label === "string")
    .slice(0, 12)
    .map((prize, index) => ({
      color:
        typeof prize.color === "string"
          ? prize.color
          : defaultPrizes[index % defaultPrizes.length].color,
      label: prize.label,
      outcome: prize.outcome === "lose" ? "lose" : "win",
      probability: Math.max(0, Number(prize.probability) || 0)
    }));

  return normalized.length >= 4 ? normalized : defaultPrizes;
}

function normalizeSize(size: unknown) {
  const parsed = Number(size);

  if (!Number.isFinite(parsed)) {
    return 320;
  }

  return Math.min(520, Math.max(240, parsed));
}

function pickPrize(prizes: WheelPrize[]) {
  const total = prizes.reduce((sum, prize) => sum + prize.probability, 0);
  let cursor = Math.random() * (total || prizes.length);

  for (const prize of prizes) {
    cursor -= total ? prize.probability : 1;

    if (cursor <= 0) {
      return prize;
    }
  }

  return prizes[prizes.length - 1];
}

function drawWheel(canvas: HTMLCanvasElement, prizes: WheelPrize[], rotation: number) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const radius = canvas.width / 2;
  const segmentAngle = (Math.PI * 2) / prizes.length;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(radius, radius);
  context.rotate(rotation);

  prizes.forEach((prize, index) => {
    const startAngle = index * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius - 4, startAngle, endAngle);
    context.closePath();
    context.fillStyle = prize.color;
    context.fill();
    context.save();
    context.rotate(startAngle + segmentAngle / 2);
    context.fillStyle = "#ffffff";
    context.font = "600 14px sans-serif";
    context.textAlign = "right";
    context.fillText(prize.label, radius - 18, 4);
    context.restore();
  });

  context.restore();
  context.beginPath();
  context.moveTo(radius, 8);
  context.lineTo(radius - 12, 34);
  context.lineTo(radius + 12, 34);
  context.closePath();
  context.fillStyle = "#111827";
  context.fill();
}

export { FortuneWheel, fortuneWheelSchema, pickPrize };
export default FortuneWheel;
