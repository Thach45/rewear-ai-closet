import 'dotenv/config';

import { loadEnv } from './config/env.js';
import { createApp } from './app.js';

const { PORT: port } = loadEnv();

const app = createApp();

// app.listen(port, () => {
//   // eslint-disable-next-line no-console
//   console.log(`Rewear API http://localhost:${port}`);
// });

app.listen(4000, '0.0.0.0', () => {
  console.log(`Rewear API running on port ${port}`);
});