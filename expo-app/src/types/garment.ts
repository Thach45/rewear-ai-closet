export type GarmentCategory = 'top' | 'bottom' | 'shoes' | 'outer' | 'accessory';

/** Payload từ API `/garments` */
export type Garment = {
  id: string;
  userId: string;
  name: string;
  category: GarmentCategory;
  imageUrl: string;
  recycledImageUrl: string;
  brand: string;
  material: string;
  fit: string | null;
  pattern: string | null;
  size: string;
  color: string;
  careWash: string;
  careDry: string;
  note: string | null;
  purchasePriceVnd: number | null;
  wearCount: number;
  lastWornAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateGarmentBody = {
  name: string;
  category: GarmentCategory;
  imageUrl: string;
  recycledImageUrl: string;
  brand: string;
  material: string;
  fit: string;
  pattern: string;
  size: string;
  color: string;
  careWash: string;
  careDry: string;
  note?: string | null;
  purchasePriceVnd?: number | null;
  wearCount?: number;
};

export type UpdateGarmentBody = Partial<Omit<CreateGarmentBody, 'category'>> & {
  category?: GarmentCategory;
};
