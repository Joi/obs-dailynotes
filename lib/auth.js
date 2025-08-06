const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}

/**
 * Create an OAuth2 client with the given credentials
 * @param {Object} credentials The authorization client credentials.
 * @param {string} tokenPath Path to store/retrieve token
 * @returns {Promise<google.auth.OAuth2>} The authorized OAuth2 client
 */
async function authorize(credentials, tokenPath) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    try {
        const resolvedTokenPath = resolveHome(tokenPath);
        const token = await fs.promises.readFile(resolvedTokenPath, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        return await getAccessToken(oAuth2Client, tokenPath);
    }
}

/**
 * Get and store new token after prompting for user authorization
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {string} tokenPath Path to store the token
 */
async function getAccessToken(oAuth2Client, tokenPath) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    try {
        const code = await new Promise((resolve) => {
            rl.question('Enter the code from that page here: ', resolve);
        });
        rl.close();
        
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        const resolvedTokenPath = resolveHome(tokenPath);
        const tokenDir = path.dirname(resolvedTokenPath);
        
        await fs.promises.mkdir(tokenDir, { recursive: true });
        
        await fs.promises.writeFile(resolvedTokenPath, JSON.stringify(tokens), {
            mode: 0o600
        });
        
        return oAuth2Client;
    } catch (error) {
        rl.close();
        throw new Error(`Error retrieving access token: ${error.message}`);
    }
}

module.exports = {
    authorize,
    resolveHome
};