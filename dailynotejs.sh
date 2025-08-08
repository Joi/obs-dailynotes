#!/bin/sh
# Change to the script's directory so .env file can be found
cd "$(dirname "$0")"
DOTENV_CONFIG_DEBUG=false DOTENV_CONFIG_SILENT=true node /Users/joi/obs-dailynotes/index.js
