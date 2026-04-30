import { GoogleAuth } from 'google-auth-library';
import { inspect } from 'node:util';
import { loadEnv } from '../config/env.js';
import { uploadTryOnImageBuffer } from '../lib/cloudinary.js';

const MODEL_NAME = 'virtual-try-on-001';

type VertexPredictResponse = {
  predictions?: Array<{
    mimeType?: string;
    bytesBase64Encoded?: string;
  }>;
};

function errorToDetail(error: unknown): string {
  if (error instanceof Error) {
    if (error.message) return error.message;
    return inspect(error, { depth: 4 });
  }
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return inspect(error, { depth: 4 });
    }
  }
  return String(error);
}

function safeHost(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return 'invalid-url';
  }
}

async function validatePublicImageUrl(label: 'person' | 'garment', url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `TRY_ON_INPUT_IMAGE_UNREACHABLE: ${JSON.stringify({
        input: label,
        reason: 'invalid_url',
        url,
      })}`
    );
  }
  if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
    throw new Error(
      `TRY_ON_INPUT_IMAGE_UNREACHABLE: ${JSON.stringify({
        input: label,
        reason: 'unsupported_protocol',
        protocol: parsed.protocol,
        host: parsed.host,
      })}`
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(
        JSON.stringify({
          input: label,
          reason: 'http_not_ok',
          status: res.status,
          host: parsed.host,
        })
      );
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      throw new Error(
        JSON.stringify({
          input: label,
          reason: 'not_image_content_type',
          contentType,
          host: parsed.host,
        })
      );
    }
  } catch (error) {
    const detail =
      error instanceof Error && error.message.startsWith('{')
        ? error.message
        : JSON.stringify({
            input: label,
            reason: 'fetch_failed',
            host: parsed.host,
            detail: errorToDetail(error),
          });
    throw new Error(`TRY_ON_INPUT_IMAGE_UNREACHABLE: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url, { method: 'GET', redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`download_failed_status_${res.status}`);
  }
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`download_not_image_content_type_${contentType}`);
  }
  const arr = await res.arrayBuffer();
  const buf = Buffer.from(arr);
  if (buf.length === 0) {
    throw new Error('download_empty_image');
  }
  return buf.toString('base64');
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const value = typeof token === 'string' ? token : token.token;
  if (!value) {
    throw new Error('missing_google_access_token');
  }
  return value;
}

export async function generateTryOnImage(input: {
  userId: string;
  personImageUrl: string;
  garmentImageUrl: string;
}): Promise<{ outputImageUrl: string; maskedImageUrl: string }> {
  await validatePublicImageUrl('person', input.personImageUrl);
  await validatePublicImageUrl('garment', input.garmentImageUrl);

  const env = loadEnv();
  if (!env.GOOGLE_CLOUD_PROJECT) {
    throw new Error(
      `TRY_ON_PROVIDER_FAILED: ${JSON.stringify({
        provider: 'google-vton',
        message: 'Missing GOOGLE_CLOUD_PROJECT',
      })}`
    );
  }

  try {
    const [personBase64, productBase64, accessToken] = await Promise.all([
      fetchImageAsBase64(input.personImageUrl),
      fetchImageAsBase64(input.garmentImageUrl),
      getAccessToken(),
    ]);

    const endpoint = `https://${env.GOOGLE_CLOUD_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GOOGLE_CLOUD_PROJECT}/locations/${env.GOOGLE_CLOUD_LOCATION}/publishers/google/models/${MODEL_NAME}:predict`;
    const body = {
      instances: [
        {
          personImage: {
            image: { bytesBase64Encoded: personBase64 },
          },
          productImages: [
            {
              image: { bytesBase64Encoded: productBase64 },
            },
          ],
        },
      ],
      parameters: {
        sampleCount: 1,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(
        `TRY_ON_PROVIDER_FAILED: ${JSON.stringify({
          provider: 'google-vton',
          endpoint,
          status: res.status,
          response: rawText.slice(0, 4000),
          personImageHost: safeHost(input.personImageUrl),
          garmentImageHost: safeHost(input.garmentImageUrl),
        })}`
      );
    }

    const data = JSON.parse(rawText) as VertexPredictResponse;
    const first = data.predictions?.[0];
    const outputBase64 = first?.bytesBase64Encoded;
    if (!outputBase64) {
      throw new Error(
        `TRY_ON_PROVIDER_FAILED: ${JSON.stringify({
          provider: 'google-vton',
          endpoint,
          message: 'No prediction image returned',
          personImageHost: safeHost(input.personImageUrl),
          garmentImageHost: safeHost(input.garmentImageUrl),
        })}`
      );
    }

    const outputBuffer = Buffer.from(outputBase64, 'base64');
    if (outputBuffer.length === 0) {
      throw new Error(
        `TRY_ON_PROVIDER_FAILED: ${JSON.stringify({
          provider: 'google-vton',
          endpoint,
          message: 'Prediction image was empty',
        })}`
      );
    }

    const persistedOutputUrl = await uploadTryOnImageBuffer(outputBuffer, input.userId);
    return { outputImageUrl: persistedOutputUrl, maskedImageUrl: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('TRY_ON_PROVIDER_FAILED:')) {
      throw error;
    }
    throw new Error(
      `TRY_ON_PROVIDER_FAILED: ${JSON.stringify({
        provider: 'google-vton',
        message: 'Unhandled provider error',
        detail: errorToDetail(error),
        personImageHost: safeHost(input.personImageUrl),
        garmentImageHost: safeHost(input.garmentImageUrl),
      })}`
    );
  }
}
