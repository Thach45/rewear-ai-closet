import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../config/env.js';

export type GeminiOutfitResponse = {
  model: string;
  text: string;
};

const OUTFIT_SYSTEM_PROMPT = [
  'Bạn là Stylist AI cho ứng dụng Rewear.',
  'Nhiệm vụ: gợi ý 1 set phối đồ có thể mặc thật từ danh sách tủ đồ được cung cấp.',
  'Quy tắc bắt buộc:',
  '- Chỉ dùng garment ID có trong input.',
  '- Không tự bịa thêm sản phẩm, ID, category hoặc thuộc tính.',
  '- Chỉ trả về DUY NHẤT 1 JSON object. Không markdown, không code fence, không text thừa.',
  '- Key JSON phải đúng chính xác: topId, bottomId, shoesId, reason.',
  '- Ưu tiên set thực tế, hợp ngữ cảnh vibe + dịp.',
  '- Tránh clash hoa văn mạnh trừ khi input yêu cầu.',
  '- Ưu tiên silhouette cân bằng theo fit và vai trò category.',
].join('\n');

/**
 * Thin service wrapper for Gemini text generation.
 * Keeps AI SDK details isolated from business logic.
 */
export class GeminiOutfitService {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const env = loadEnv();
    const apiKey = opts?.apiKey ?? env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = opts?.model ?? env.GEMINI_MODEL;
  }

  async suggestFromPrompt(prompt: string): Promise<GeminiOutfitResponse> {
    // eslint-disable-next-line no-console
    console.log('[ai][gemini] request:start', {
      model: this.model,
      promptChars: prompt.length,
    });
    const result = await this.client.models.generateContent({
      model: this.model,
      contents: `${OUTFIT_SYSTEM_PROMPT}\n\n# USER_CONTEXT\n${prompt}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            topId: { type: 'string' },
            bottomId: { type: 'string' },
            shoesId: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['topId', 'bottomId', 'shoesId'],
          propertyOrdering: ['topId', 'bottomId', 'shoesId', 'reason'],
        },
      },
    });
    // eslint-disable-next-line no-console
    console.log('[ai][gemini] request:done', {
      model: this.model,
      hasText: Boolean(result.text),
      textChars: result.text?.length ?? 0,
    });

    return {
      model: this.model,
      text: result.text ?? '',
    };
  }
}
