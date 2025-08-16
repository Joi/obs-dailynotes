#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const dashboardPath = path.join(vaultRoot, 'GTD', 'dashboard.md');

const child = spawn(
  process.execPath,
  [path.join(__dirname, 'syncRemindersEnhanced.js'), '--file', dashboardPath],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Never allow edits when scanning dashboard as a source
      SYNC_EDIT_EXISTING: 'false',
      SYNC_CREATE_NEW: 'false'
    }
  }
);

child.on('exit', (code) => process.exit(code));


