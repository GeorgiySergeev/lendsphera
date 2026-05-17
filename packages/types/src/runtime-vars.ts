export type RuntimeVars = {
  landingId: string;
  versionId: string | null;
  cachedUntil: string;
  vars: {
    LS_PRICE: string;
    LS_OLD_PRICE: string;
    LS_CURRENCY: string;
    LS_DISCOUNT: string;
    LS_PRODUCT_NAME: string;
    LS_PRODUCT_IMAGE: string;
    LS_PIXEL_ID: string;
    LS_POSTBACK_URL: string;
    LS_CTA: string;
    LS_DISCLAIMER: string;
    [key: `LS_${string}`]: string;
  };
};
