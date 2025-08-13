#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const dashboardPath = path.join(vaultRoot, 'GTD', 'dashboard.md');

const child = spawn(process.execPath, [path.join(__dirname, 'syncRemindersEnhanced.js'), '--file', dashboardPath], {
    stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code));


