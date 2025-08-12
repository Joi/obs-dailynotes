#!/bin/bash

# Create symbolic link from switchboard to obs-dailynotes SCRIPTS.md
cd /Users/<Owner>/switchboard
ln -s /Users/<Owner>/obs-dailynotes/SCRIPTS.md SCRIPTS.md

echo "Created symlink: /Users/<Owner>/switchboard/SCRIPTS.md -> /Users/<Owner>/obs-dailynotes/SCRIPTS.md"

# Verify the link
ls -la SCRIPTS.md
