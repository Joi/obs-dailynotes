/**
 * Google Calendar to Obsidian Daily Notes
 * Modularized version
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const { authorize, resolveHome } = require('./lib/auth');
const { createLogger } = require('./lib/logger');
const { loadConfig, createFilterRegex } = require('./lib/config');
const { runDailyPipeline } = require('./lib/pipelines/daily');
const { validateConfig } = require('./lib/configSchema');

// Load environment variables
const dotenvPath = path.join(__dirname, '.env');
const dotenvResult = dotenv.config({ path: dotenvPath });
if (dotenvResult.error) {
	console.error('Error loading .env file:', dotenvResult.error);
	process.exit(1);
}

// Validate required environment variables
const TOKEN_PATH = process.env.GCAL_TOKEN_PATH;
const CREDS_PATH = process.env.GCAL_CREDS_PATH;
const PATH_PREFIX = process.env.DAILY_NOTE_PATH;

if (!TOKEN_PATH || !CREDS_PATH || !PATH_PREFIX) {
	console.error('Error: Required environment variables are missing.');
	console.error('Please ensure GCAL_TOKEN_PATH, GCAL_CREDS_PATH, and DAILY_NOTE_PATH are set in your .env file.');
	process.exit(1);
}

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const config = loadConfig(configPath);
const log = createLogger();
// Warn on suspicious/personal config
try { validateConfig(config).forEach(w => log.warn(w)); } catch (_) {}

// Use event filter from config, with env override
const EVENTS_FILTER = process.env.EVENTS_FILTER 
	? process.env.EVENTS_FILTER.split(',').map(f => f.trim())
	: config.filters.eventTitles;

// Create filter regex patterns
const eventsFilterRegex = createFilterRegex(EVENTS_FILTER);

async function main() {
	try {
		// Load client secrets
		const credentialsPath = resolveHome(CREDS_PATH);
		const content = await fs.promises.readFile(credentialsPath, 'utf8');
		const credentials = JSON.parse(content);

		// Authorize and get OAuth2 client
		const auth = await authorize(credentials, TOKEN_PATH);

		await runDailyPipeline({ auth, config, pathPrefix: PATH_PREFIX, log, eventsFilterRegex });
	} catch (error) {
		log.error('Error:', error && error.message ? error.message : error);
		process.exit(1);
	}
}

// Start the application
main();