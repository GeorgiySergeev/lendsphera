export type PriceInput = {
  productId: string;
  geoId: string | null;
  price: number;
  oldPrice?: number;
  currency: string;
  validFrom: string;
  notes?: string;
};

export type PriceResolveResult = {
  id: string;
  price: number;
  oldPrice: number | null;
  currency: string;
  validFrom: string;
  geoId: string | null;
  formatted: {
    price: string;
    oldPrice: string | null;
    discount: string | null;
  };
};
