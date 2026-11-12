// Copies SQL files next to the compiled JS so migrations work from dist/.
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/db', { recursive: true });
cpSync('src/db/schema.sql', 'dist/db/schema.sql');
console.log('Copied schema.sql to dist/db');
