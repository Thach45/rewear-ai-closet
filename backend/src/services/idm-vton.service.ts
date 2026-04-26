import { client, handle_file } from '@gradio/client';
import { inspect } from 'node:util';
import { loadEnv } from '../config/env.js';

let cachedClient: Awaited<ReturnType<typeof client>> | null = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  cachedClient = await client(env.HF_IDM_VTON_SPACE, {
    hf_token: env.HF_TOKEN,
  });
  return cachedClient;
}

type GradioFileData = {
  path?: string;
  url?: string;

};

type PredictData = [string | GradioFileData, string | GradioFileData];
type ProviderStatusError = {
  type?: string;
  endpoint?: string;
  fn_index?: number;
  time?: string;
  queue?: boolean;
  title?: string;
  message?: string;
  stage?: string;
  success?: boolean;
};

function toFileUrl(value: string | GradioFileData | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.url ?? '';
}

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

function parseProviderStatus(detail: string): ProviderStatusError | null {
  try {
    const parsed = JSON.parse(detail) as ProviderStatusError;
    if (parsed && typeof parsed === 'object' && parsed.endpoint) return parsed;
    return null;
  } catch {
    return null;
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

export async function generateTryOnImage(input: {
  personImageUrl: string;
  garmentImageUrl: string;
}): Promise<{ outputImageUrl: string; maskedImageUrl: string }> {
  await validatePublicImageUrl('person', input.personImageUrl);
  await validatePublicImageUrl('garment', input.garmentImageUrl);

  const app = await getClient();
  const payload = [
    {
      background: handle_file(input.personImageUrl),
      layers: [],
      composite: null,
    },
    handle_file(input.garmentImageUrl),
    'Rewear try-on',
    true,
    true,
    // Current Space requires denoising steps >= 20.
    30,
    3,
  ] as const;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await app.predict('/tryon', payload);
      const [rawOutput, rawMasked] = result.data as PredictData;
      const outputImageUrl = toFileUrl(rawOutput);
      const maskedImageUrl = toFileUrl(rawMasked);
      if (!outputImageUrl) {
        throw new Error('IDM-VTON returned empty output image');
      }
      return { outputImageUrl, maskedImageUrl };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
  }

  const detail = errorToDetail(lastError);
  const provider = parseProviderStatus(detail);
  const normalized = provider
    ? {
        provider: 'idm-vton',
        endpoint: provider.endpoint ?? '/tryon',
        stage: provider.stage ?? 'unknown',
        message: provider.message ?? 'Provider returned unknown error',
        queue: provider.queue ?? null,
        success: provider.success ?? false,
        fnIndex: provider.fn_index ?? null,
        personImageHost: safeHost(input.personImageUrl),
        garmentImageHost: safeHost(input.garmentImageUrl),
        attempts: 2,
      }
    : {
        provider: 'idm-vton',
        endpoint: '/tryon',
        stage: 'unknown',
        message: 'Provider error could not be parsed',
        raw: detail,
        personImageHost: safeHost(input.personImageUrl),
        garmentImageHost: safeHost(input.garmentImageUrl),
        attempts: 2,
      };
  throw new Error(`TRY_ON_PROVIDER_FAILED: ${JSON.stringify(normalized)}`);
}
