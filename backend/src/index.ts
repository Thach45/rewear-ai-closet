import 'dotenv/config';

import { bootstrapGoogleCredentialsFromEnv } from './config/google-credentials.js';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';

bootstrapGoogleCredentialsFromEnv();
const { PORT: port } = loadEnv();

const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Rewear API http://localhost:${port}`);
});
