/**
 * Dummy data for UI prototyping — replace with API later
 */

export type WardrobeCategory = 'top' | 'bottom' | 'shoes' | 'outer' | 'accessory' | 'onepiece';

/** Nhãn hiển thị — đồng bộ filter tủ đồ / form */
export const WARDROBE_CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  top: 'Áo',
  bottom: 'Quần',
  shoes: 'Giày',
  outer: 'Áo khoác',
  accessory: 'Phụ kiện',
  onepiece: 'Đầm / Jumpsuit',
};

/** Tủ đồ (rack) — ảnh thật + tái chế, dùng chung Tủ đồ & Trạm TS */
export interface RackWardrobeItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  image: string;
  recycledImage: string;
  brand: string;
  material: string;
  fit?: string;
  pattern?: string;
  /** Chi tiết hiển thị trong modal */
  size: string;
  color: string;
  careWash: string;
  careDry: string;
  /** Ghi chú ngắn (VD: nguồn, năm mua) */
  note?: string;
}

export const RACK_WARDROBE_ITEMS: RackWardrobeItem[] = [
  {
    id: '1',
    name: 'Áo thun Eco',
    category: 'top',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80',
    brand: 'Patagonia',
    material: 'Organic Cotton',
    size: 'M',
    color: 'Đen',
    careWash: 'Giặt máy 30°C',
    careDry: 'Phơi ngang, không sấy nóng',
    note: 'Mua 2023',
  },
  {
    id: '2',
    name: 'Quần Jean tái chế',
    category: 'bottom',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&q=80',
    brand: "Levi's",
    material: 'Recycled Denim',
    size: 'W30 L32',
    color: 'Indigo',
    careWash: 'Giặt máy nhẹ, lộn trái',
    careDry: 'Phơi bóng râm',
    note: 'Fair Trade',
  },
  {
    id: '3',
    name: 'Giày Sneaker',
    category: 'shoes',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&q=80',
    brand: 'Veja',
    material: 'Vegan Leather',
    size: 'EU 40',
    color: 'Trắng / be',
    careWash: 'Lau khăn ẩm',
    careDry: 'Giấy báo bên trong, tránh nắng gắt',
  },
  {
    id: '4',
    name: 'Áo khoác mùa đông',
    category: 'outer',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=500&q=80',
    brand: 'The North Face',
    material: 'Recycled Poly',
    size: 'L',
    color: 'Xanh rêu',
    careWash: 'Giặt tay hoặc máy nhẹ 30°C',
    careDry: 'Không sấy — phơi thông gió',
    note: 'Có túi trong',
  },
  {
    id: '5',
    name: 'Kính râm sinh học',
    category: 'accessory',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=500&q=80',
    brand: 'Ray-Ban',
    material: 'Bio-acetate',
    size: 'Gọng chuẩn',
    color: 'Đen / xanh lá',
    careWash: 'Nước + khăn mềm',
    careDry: 'Bảo quản trong hộp',
  },
  {
    id: '6',
    name: 'Túi Tote vải',
    category: 'accessory',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500&q=80',
    brand: 'EcoBrand',
    material: 'Canvas',
    size: '38×42 cm',
    color: 'Tự nhiên',
    careWash: 'Giặt tay, không tẩy mạnh',
    careDry: 'Phơi phẳng',
  },
  {
    id: '7',
    name: 'Áo Sơ mi lanh',
    category: 'top',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=500&q=80',
    recycledImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=80',
    brand: 'Uniqlo',
    material: 'Linen',
    size: 'M',
    color: 'Kem',
    careWash: 'Giặt máy túi lưới, 30°C',
    careDry: 'Ủi ẩm nhẹ',
    note: 'Dễ nhăn — treo móc',
  },
];

export interface VibeChip {
  id: string;
  label: string;
}

export interface OutfitPiece {
  id: string;
  label: string;
  imageUrl: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  imageUrl: string;
}

export interface UpcycleIdea {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface Badge {
  id: string;
  title: string;
  emoji: string;
}

export const VIBES: VibeChip[] = [
  { id: '1', label: '✨ Năng lượng' },
  { id: '2', label: '☕ Chữa lành' },
  { id: '3', label: '📚 Đi học' },
  { id: '4', label: '🌿 Tối giản' },
  { id: '5', label: '💫 Y2K' },
  { id: '6', label: '🎧 Street' },
  { id: '7', label: '🧠 Smart Casual' },
  { id: '8', label: '🖤 Monochrome' },
  { id: '9', label: '🌦️ Hằng ngày' },
  { id: '10', label: '🌙 Date Night' },
];

export const OUTFIT_PIECES: OutfitPiece[] = [
  {
    id: 'top',
    label: 'Áo',
    imageUrl: 'https://picsum.photos/seed/rewear-top/300/320',
  },
  {
    id: 'bottom',
    label: 'Quần',
    imageUrl: 'https://picsum.photos/seed/rewear-bottom/300/320',
  },
  {
    id: 'acc',
    label: 'Phụ kiện',
    imageUrl: 'https://picsum.photos/seed/rewear-acc/300/320',
  },
];

/** Trang chủ — 3 hàng: áo / quần / giày */
export interface HomeCatalogItem {
  id: string;
  name: string;
  imageUrl: string;
}

export const HOME_TOPS: HomeCatalogItem[] = [
  { id: 't1', name: 'Áo thun trắng', imageUrl: 'https://picsum.photos/seed/homet1/400/520' },
  { id: 't2', name: 'Sơ mi linen', imageUrl: 'https://picsum.photos/seed/homet2/400/520' },
  { id: 't3', name: 'Hoodie xanh', imageUrl: 'https://picsum.photos/seed/homet3/400/520' },
  { id: 't4', name: 'Tank top', imageUrl: 'https://picsum.photos/seed/homet4/400/520' },
];

export const HOME_BOTTOMS: HomeCatalogItem[] = [
  { id: 'b1', name: 'Quần jean', imageUrl: 'https://picsum.photos/seed/homeb1/400/520' },
  { id: 'b2', name: 'Quần tây', imageUrl: 'https://picsum.photos/seed/homeb2/400/520' },
  { id: 'b3', name: 'Short kaki', imageUrl: 'https://picsum.photos/seed/homeb3/400/520' },
  { id: 'b4', name: 'Chân váy A', imageUrl: 'https://picsum.photos/seed/homeb4/400/520' },
];

export const HOME_SHOES: HomeCatalogItem[] = [
  { id: 's1', name: 'Sneaker trắng', imageUrl: 'https://picsum.photos/seed/homes1/400/520' },
  { id: 's2', name: 'Boot cổ thấp', imageUrl: 'https://picsum.photos/seed/homes2/400/520' },
  { id: 's3', name: 'Loafer da', imageUrl: 'https://picsum.photos/seed/homes3/400/520' },
  { id: 's4', name: 'Sandal sport', imageUrl: 'https://picsum.photos/seed/homes4/400/520' },
];

/** Gợi ý theo vibe (demo) — index theo thứ tự VIBES */
export function getSuggestedCatalogIds(vibeId: string): {
  topId: string;
  bottomId: string;
  shoeId: string;
} {
  const i = Math.max(0, VIBES.findIndex((v) => v.id === vibeId));
  return {
    topId: HOME_TOPS[i % HOME_TOPS.length].id,
    bottomId: HOME_BOTTOMS[(i + 1) % HOME_BOTTOMS.length].id,
    shoeId: HOME_SHOES[(i + 2) % HOME_SHOES.length].id,
  };
}

export const WARDROBE_ITEMS: WardrobeItem[] = [
  {
    id: 'w1',
    name: 'Áo thun trắng',
    category: 'top',
    imageUrl: 'https://picsum.photos/seed/w1/400/500',
  },
  {
    id: 'w2',
    name: 'Sơ mi kẻ',
    category: 'top',
    imageUrl: 'https://picsum.photos/seed/w2/400/500',
  },
  {
    id: 'w3',
    name: 'Quần jean xanh',
    category: 'bottom',
    imageUrl: 'https://picsum.photos/seed/w3/400/500',
  },
  {
    id: 'w4',
    name: 'Chân váy linen',
    category: 'bottom',
    imageUrl: 'https://picsum.photos/seed/w4/400/500',
  },
  {
    id: 'w5',
    name: 'Túi tote',
    category: 'accessory',
    imageUrl: 'https://picsum.photos/seed/w5/400/500',
  },
  {
    id: 'w6',
    name: 'Khăn lụa',
    category: 'accessory',
    imageUrl: 'https://picsum.photos/seed/w6/400/500',
  },
  {
    id: 'w7',
    name: 'Sneaker canvas',
    category: 'shoes',
    imageUrl: 'https://picsum.photos/seed/w7/400/500',
  },
];

export const ECO_OLD_ITEM_IMAGE = 'https://picsum.photos/seed/ecoold/800/600';

export const UPCYCLE_IDEAS: UpcycleIdea[] = [
  {
    id: 'u1',
    title: 'Cắt thành crop-top',
    description: 'Tận dụng phần thân áo cũ, bo gấu bằng đường chỉ zigzag.',
    thumbnailUrl: 'https://picsum.photos/seed/up1/320/180',
  },
  {
    id: 'u2',
    title: 'May túi tote mini',
    description: 'Gấp đôi vải, may hai đường bên và quai từ ống tay.',
    thumbnailUrl: 'https://picsum.photos/seed/up2/320/180',
  },
  {
    id: 'u3',
    title: 'Thành khăn bandana',
    description: 'Cắt vuông 55cm, viền mép — phối cùng outfit neutral.',
    thumbnailUrl: 'https://picsum.photos/seed/up3/320/180',
  },
];

export const PROFILE_USER = {
  name: 'Minh Anh',
  personImageUrl: 'https://picsum.photos/seed/avatar/200/200',
  heightCm: 165,
  weightKg: 52,
  reuseCount: 15,
  co2Kg: 5,
};

export const BADGES: Badge[] = [
  { id: 'b1', title: 'Chiến thần tái chế', emoji: '♻️' },
  { id: 'b2', title: 'Tủ đồ xanh', emoji: '🌿' },
  { id: 'b3', title: 'Stylist AI', emoji: '✨' },
];
