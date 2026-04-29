import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../config/env.js';

export class GarmentAiService {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const env = loadEnv();
    const apiKey = opts?.apiKey ?? env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY for Garment AI Service');
    }
    this.client = new GoogleGenAI({ apiKey });
    // Use flash model by default because it's fast and multimodal
    this.model = opts?.model ?? 'gemini-2.5-flash';
  }

  async analyzeGarmentFromUrl(imageUrl: string): Promise<any> {
    try {
      console.log(`[ai][gemini] analyzeGarmentFromUrl: Fetching image...`);
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imgResponse.statusText}`);
      }
      const buffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';

      const systemPrompt = `Bạn là trợ lý thời trang AI cho ứng dụng Rewear.
Nhiệm vụ của bạn là phân tích hình ảnh trang phục và trích xuất thông tin.
Tuyệt đối chỉ trả về dữ liệu dưới định dạng JSON, không có bất kỳ văn bản nào khác.
Sử dụng cấu trúc sau:
{
  "name": "Tên món đồ ngắn gọn (ví dụ: Áo thun trắng cơ bản)",
  "category": "top | bottom | shoes | outer | accessory",
  "color": "Màu chủ đạo (ví dụ: Trắng, Xanh dương, Đen, Đỏ, Vàng, Xanh lá, Tím, Cam, Hồng, Nâu, Xám, Vàng chanh, ...)",
  "brand": "Thương hiệu (nếu có thể nhìn thấy, không thì để '-')",
  "material": "Chất liệu dự đoán (ví dụ: Cotton, Denim, Kaki, Lụa ...)",
  "pattern": "Họa tiết (ví dụ: Trơn, Kẻ sọc, Chữ in, Họa tiết hình học, ...)",
  "fit": "Form dáng (ví dụ: Slim, Regular, Loose Oversize, Boxy ...)",
  "size": "Kích cỡ dự đoán (nếu thấy mác áo, không thì để '-')",
  "careWash": "Giặt máy | Giặt tay | Giặt khô",
  "careDry": "Sấy khô | Phơi bóng râm | Khác"
}
Lưu ý:
- category BẮT BUỘC phải là một trong 5 giá trị: top, bottom, shoes, outer, accessory.
- Nếu không chắc chắn, hãy đưa ra lựa chọn an toàn nhất hoặc để '-' thay vì bỏ trống.`;
      console.log(`[ai][gemini] analyzeGarmentFromUrl: generating content...`);
      const generateResult = await this.client.models.generateContent({
        model: this.model,
        contents: [
          systemPrompt,
          {
            inlineData: {
              data: base64,
              mimeType: mimeType,
            },
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      console.log(`[ai][gemini] analyzeGarmentFromUrl: done!`);
      let text = generateResult.text ?? '{}';

      // Remove markdown codeblock backticks if present
      if (text.includes('```')) {
        text = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      }

      return JSON.parse(text);
    } catch (error) {
      console.error(`[ai][gemini] analyzeGarmentFromUrl: Error during analysis:`, error);
      // Return a safe fallback object so the upload doesn't completely fail
      return {
        name: '-',
        category: 'top', // fallback to a valid category
        color: '-',
        brand: '-',
        material: '-',
        pattern: '-',
        fit: '-',
        size: '-',
        careWash: '-',
        careDry: '-'
      };
    }
  }
}
