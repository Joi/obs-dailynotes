# .env File Sync Strategy

**Question**: How to keep .env synced across machines without committing to GitHub?

---

## Options

### Option 1: Private Git Repository (Recommended)

**Create a separate private repo for secrets:**

```bash
# On your main machine
cd ~
mkdir dotfiles-private
cd dotfiles-private
git init

# Add .env files
cp ~/obs-dailynotes/.env env-obs-dailynotes
cp ~/other-project/.env env-other-project
git add .
git commit -m "Initial env files"

# Push to private GitHub repo
git remote add origin git@github.com:Joi/dotfiles-private.git
git push -u origin main
```

**On other machines:**
```bash
cd ~
git clone git@github.com:Joi/dotfiles-private.git
ln -s ~/dotfiles-private/env-obs-dailynotes ~/obs-dailynotes/.env
```

**Benefits:**
- Git history and version control
- Easy sync: `git pull` / `git push`
- Can use on all machines
- Organized in one place

**Security:**
- Make repository PRIVATE
- Use SSH keys (not HTTPS)
- Only clone on trusted machines

### Option 2: iCloud/Dropbox Symlink

**Store .env in iCloud, symlink to project:**

```bash
# Move .env to iCloud
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/env-files
mv ~/obs-dailynotes/.env ~/Library/Mobile\ Documents/com~apple~CloudDocs/env-files/env-obs-dailynotes

# Create symlink
ln -s ~/Library/Mobile\ Documents/com~apple~CloudDocs/env-files/env-obs-dailynotes \
      ~/obs-dailynotes/.env
```

**Benefits:**
- Automatic sync via iCloud
- No manual push/pull
- Works across all Apple devices

**Drawbacks:**
- No version history
- Sync conflicts possible
- Requires iCloud Drive

### Option 3: 1Password / Bitwarden .env Storage

**Use password manager's secure notes:**

1. Store .env content in 1Password secure note
2. Use 1Password CLI to fetch on each machine:

```bash
# One-time setup per machine
brew install 1password-cli

# Fetch .env when needed
op read "op://Private/obs-dailynotes-env/content" > ~/obs-dailynotes/.env
```

**Benefits:**
- Highly secure
- Encrypted sync
- Access from mobile
- Audit trail

**Drawbacks:**
- Requires 1Password subscription
- Manual fetch (not automatic)

### Option 4: Encrypted Git (git-crypt)

**Encrypt .env in the main repo:**

```bash
cd ~/obs-dailynotes

# Install git-crypt
brew install git-crypt

# Initialize
git-crypt init

# Configure to encrypt .env
echo '.env filter=git-crypt diff=git-crypt' >> .gitattributes
git add .gitattributes
git-crypt status

# Add .env (will be encrypted)
git add .env
git commit -m "Add encrypted .env"

# On other machines
git-crypt unlock
```

**Benefits:**
- .env in main repo
- Encrypted in GitHub
- Standard git workflow

**Drawbacks:**
- Setup complexity
- Key management
- Risk if key lost

---

## Recommendation for You

**Use Option 1: Private Git Repo**

Why:
- Simple and familiar (git workflow)
- Version history
- Easy to sync
- No encryption complexity
- Can store all env files in one place

**Quick Setup:**

```bash
# 1. Create private repo on GitHub: Joi/dotfiles-private

# 2. Set up locally
cd ~
mkdir dotfiles-private
cd dotfiles-private
git init

# 3. Add your .env files (with descriptive names)
cp ~/obs-dailynotes/.env obs-dailynotes.env
cp ~/amplifier/.env amplifier.env  # if you have others

# 4. Create README
cat > README.md << 'END'
# Private Dotfiles

Environment files and secrets for various projects.

## Files
- obs-dailynotes.env → ~/obs-dailynotes/.env
- amplifier.env → ~/amplifier/.env

## Setup on new machine
```bash
git clone git@github.com:Joi/dotfiles-private.git ~/dotfiles-private
ln -s ~/dotfiles-private/obs-dailynotes.env ~/obs-dailynotes/.env
```
END

# 5. Commit and push
git add .
git commit -m "Initial env files"
git remote add origin git@github.com:Joi/dotfiles-private.git
git push -u origin main
```

**On other machines:**
```bash
git clone git@github.com:Joi/dotfiles-private.git ~/dotfiles-private
ln -s ~/dotfiles-private/obs-dailynotes.env ~/obs-dailynotes/.env
ln -s ~/dotfiles-private/amplifier.env ~/amplifier/.env
```

**To update:**
```bash
cd ~/dotfiles-private
git pull    # Get latest
# or
git add obs-dailynotes.env
git commit -m "Update API key"
git push    # Share to other machines
```

---

## Alternative: Simple Shell Script

**If you just have 2-3 machines:**

Create `~/sync-env.sh`:

```bash
#!/bin/bash
# Sync .env files between machines

REMOTE="user@other-machine.local"
ENV_DIR="~/dotfiles-private"

# Push to remote
scp ~/obs-dailynotes/.env $REMOTE:$ENV_DIR/obs-dailynotes.env

# Or pull from remote  
scp $REMOTE:$ENV_DIR/obs-dailynotes.env ~/obs-dailynotes/.env
```

Run manually when needed.

---

## Security Best Practices

**Whichever method you choose:**

1. **Never commit .env to public repos** ✓ (already gitignored)
2. **Use SSH keys, not passwords** for private repos
3. **Rotate API keys periodically**
4. **Different keys per environment** if possible
5. **Document which keys are where**

**Note**: Your .env currently contains API keys (OpenAI, Talivy).
These should be kept secure!

---

**My recommendation**: Set up the private GitHub repo - 5 minutes of setup, 
then `git pull/push` is all you need. Simple and reliable.

Want me to help you set it up?
