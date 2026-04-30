export type GarmentCategory = 'top' | 'bottom' | 'shoes' | 'outer' | 'accessory' | 'onepiece';

/** Payload từ API `/garments` — đồng bộ Prisma schema */
export type Garment = {
  id: string;
  userId: string;
  name: string;
  category: GarmentCategory;
  subCategory?: string | null;
  imageUrl: string;
  brand: string | null;
  material: string | null;
  fit: string | null;
  pattern: string | null;
  size: string | null;
  color: string | null;
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
  subCategory?: string | null;
  imageUrl: string;
  brand?: string | null;
  material?: string | null;
  fit?: string | null;
  pattern?: string | null;
  size?: string | null;
  color?: string | null;
  note?: string | null;
  purchasePriceVnd?: number | null;
  wearCount?: number;
};

export type UpdateGarmentBody = Partial<Omit<CreateGarmentBody, 'category'>> & {
  category?: GarmentCategory;
};
