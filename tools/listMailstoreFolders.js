#!/usr/bin/env node
/**
 * List ALL folders in MailStore to find where archives are stored
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MailStoreSearch } = require('./mailstoreSearch');
const { getMailstorePassword } = require('../lib/keychain');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function listAllFolders() {
  console.log('Listing ALL MailStore Folders');
  console.log('=' + '='.repeat(60));
  
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  
  const client = new MailStoreSearch({
    ...config,
    password: config.password || getMailstorePassword({ account: config.user || process.env.MAILSTORE_USER })
  });
  
  try {
    console.log('Connecting to MailStore...');
    await client.connect();
    console.log('✓ Connected successfully!\n');
    
    console.log('Available folders:');
    console.log('-'.repeat(60));
    
    const folders = await client.listFolders();
    
    // Recursive function to list all folders and find ones with "Archive" or old years
    function listFoldersRecursive(obj, prefix = '') {
      const folderList = [];
      
      for (const [name, value] of Object.entries(obj)) {
        const fullPath = prefix ? `${prefix}/${name}` : name;
        console.log(`  ${prefix}${name}`);
        folderList.push(fullPath);
        
        // Look for archive folders or year-based folders
        if (name.toLowerCase().includes('archive') || 
            name.toLowerCase().includes('sent') ||
            name.match(/\b(19|20)\d{2}\b/) || // Years like 1999, 2000, etc
            name.toLowerCase().includes('old')) {
          console.log(`    ^ ARCHIVE FOLDER FOUND!`);
        }
        
        if (value.children) {
          const childFolders = listFoldersRecursive(value.children, prefix + '  ');
          folderList.push(...childFolders);
        }
      }
      
      return folderList;
    }
    
    const allFolders = listFoldersRecursive(folders);
    
    console.log('\n' + '='.repeat(60));
    console.log(`Total folders found: ${allFolders.length}`);
    
    // Look for likely archive folders
    console.log('\nLikely archive folders:');
    const archiveFolders = allFolders.filter(f => 
      f.toLowerCase().includes('archive') ||
      f.toLowerCase().includes('sent') ||
      f.match(/\b(19|20)\d{2}\b/) ||
      f.toLowerCase().includes('old') ||
      f.toLowerCase().includes('all mail')
    );
    
    if (archiveFolders.length > 0) {
      archiveFolders.forEach(f => console.log(`  - ${f}`));
    } else {
      console.log('  None found with obvious archive names');
      console.log('  You may need to check each account folder individually');
    }
    
    // Save folder list for reference
    const outputFile = path.join(__dirname, '..', 'data', 'mailstore-folders.json');
    fs.writeFileSync(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalFolders: allFolders.length,
      folders: allFolders,
      archiveFolders: archiveFolders
    }, null, 2));
    
    console.log(`\n✓ Folder list saved to: ${outputFile}`);
    
    client.disconnect();
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log(err.stack);
  }
}

listAllFolders().catch(console.error);
