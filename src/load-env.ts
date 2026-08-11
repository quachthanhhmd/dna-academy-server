import { config } from 'dotenv';
import { envFilePaths } from './config/env-files';

// Side-effect module: must be imported before anything that reads process.env
// at module scope. Missing files are ignored, and variables already set in
// process.env (docker compose, CI, shell) are never overridden.
config({ path: envFilePaths, quiet: true });
