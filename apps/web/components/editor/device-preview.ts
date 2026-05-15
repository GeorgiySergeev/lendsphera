type Device = "mobile" | "tablet" | "desktop";

const devicePreviewWidths: Record<Device, number | string> = {
  desktop: "100%",
  mobile: 375,
  tablet: 768
};

function toGrapesDeviceWidth(device: Device): string {
  const width = devicePreviewWidths[device];

  return typeof width === "number" ? `${width}px` : "";
}

export { devicePreviewWidths, toGrapesDeviceWidth };
export type { Device };
