import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../config/env.js';

export type GarmentAnalysisResult = {
  category: string;
  subCategory?: string;
  color?: string;
  pattern?: string;
  fit?: string;
  material?: string;
  name?: string;
};

const ANALYSIS_SYSTEM_PROMPT = `
Bạn là chuyên gia thời trang AI. Hãy phân tích ảnh quần áo được cung cấp và trả về thông tin chi tiết dưới dạng JSON.
Quy tắc:
1. Trả về DUY NHẤT JSON, không có text thừa.
2. Các giá trị phải khớp CHÍNH XÁC với danh mục hệ thống:
   - category: 'top', 'bottom', 'shoes', 'outer', 'onepiece'
   - subCategory:
     + Nếu category='top': 'tshirt', 'shirt', 'blouse', 'polo', 'tankTop', 'hoodie', 'sweater'
     + Nếu category='bottom': 'jeans', 'trousers', 'shorts', 'skirt'
     + Nếu category='shoes': 'sneakers', 'loafers', 'boots', 'sandals', 'heels'
     + Nếu category='outer': 'jacket', 'coat', 'blazer', 'cardigan'
     + Nếu category='onepiece': 'dress', 'jumpsuit'
   - fit: 'slim', 'regular', 'relaxed', 'oversized'
   - pattern: 'solid', 'stripe', 'plaid', 'graphic', 'floral', 'other'
3. name: Tên ngắn gọn (VD: "Áo thun trắng").
4. color: Tên màu tiếng Việt (VD: "Xanh Navy", "Đen").
5. material: Loại vải (VD: "Cotton", "Denim").
`.trim();

export class GarmentAIService {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const env = loadEnv();
    const apiKey = opts?.apiKey ?? env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }
    this.client = new GoogleGenAI({ apiKey });
    // Dùng model flash để nhanh và tiết kiệm
    this.model = opts?.model ?? env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  }

  /**
   * Phân tích ảnh từ URL (Cloudinary) hoặc Base64
   */
  async analyzeImage(imageUri: string): Promise<GarmentAnalysisResult> {
    // eslint-disable-next-line no-console
    console.log('[ai][garment] analyzing image...', { model: this.model });

    // Nếu là URL Cloudinary, Gemini có thể đọc trực tiếp nếu public hoặc tải về
    // Để ổn định nhất, chúng ta nên fetch ảnh về buffer và gửi sang Gemini
    
    // Lưu ý: Ở đây tôi giả định bạn gửi URL ảnh đã upload lên Cloudinary.
    // Gemini Flash hỗ trợ gửi ảnh qua inlineData (base64) hoặc fileData.
    
    // Bước 1: Tải ảnh về
    const imageRes = await fetch(imageUri);
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const result = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: ANALYSIS_SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (!result.text) {
      throw new Error('AI failed to return analysis text');
    }

    try {
      return JSON.parse(result.text) as GarmentAnalysisResult;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ai][garment] parse error', result.text);
      throw new Error('AI returned invalid JSON');
    }
  }
}
