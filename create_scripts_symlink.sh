#!/bin/bash

# Create symbolic link from switchboard to obs-dailynotes SCRIPTS.md
cd /Users/joi/switchboard
ln -s /Users/joi/obs-dailynotes/SCRIPTS.md SCRIPTS.md

echo "Created symlink: /Users/joi/switchboard/SCRIPTS.md -> /Users/joi/obs-dailynotes/SCRIPTS.md"

# Verify the link
ls -la SCRIPTS.md
