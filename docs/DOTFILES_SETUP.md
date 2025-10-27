# Setting Up Dotfiles on New Machines

Your .env file is now managed in a private repository for easy syncing.

## ✅ Already Set Up on This Machine

The .env file is now a symlink:
```
~/obs-dailynotes/.env → ~/dotfiles-private/obs-dailynotes.env
```

Changes to either location update both (they're the same file).

---

## Setup on New Machine

### 1. Clone the Private Dotfiles Repo

```bash
git clone git@github.com:Joi/dotfiles-private.git ~/dotfiles-private
```

### 2. Create Symlink

```bash
cd ~/obs-dailynotes
ln -s ~/dotfiles-private/obs-dailynotes.env .env
```

### 3. Verify

```bash
ls -la ~/.env
# Should show: .env -> /Users/joi/dotfiles-private/obs-dailynotes.env

cat .env | head -5
# Should show your Google Calendar config
```

---

## Updating .env

### On Any Machine

**Edit the file** (either location works):
```bash
# In dotfiles repo
nano ~/dotfiles-private/obs-dailynotes.env

# Or in project (via symlink)
nano ~/obs-dailynotes/.env
```

**Commit and push:**
```bash
cd ~/dotfiles-private
git add obs-dailynotes.env
git commit -m "Update OpenAI API key"
git push
```

**On other machines:**
```bash
cd ~/dotfiles-private
git pull
```

The symlink ensures the updated file is immediately available to obs-dailynotes!

---

## Adding More Projects

When you have other projects with .env files:

```bash
# Copy to dotfiles
cp ~/other-project/.env ~/dotfiles-private/other-project.env

# Commit
cd ~/dotfiles-private
git add other-project.env
git commit -m "Add other-project env"
git push

# Create symlink
cd ~/other-project
mv .env .env.backup  # Save original
ln -s ~/dotfiles-private/other-project.env .env
```

---

## What's in the Private Repo

**Repository**: https://github.com/Joi/dotfiles-private (PRIVATE)

**Current files:**
- `obs-dailynotes.env` - API keys, paths, config
- `README.md` - Setup instructions

**Future files:**
- `amplifier.env` - When amplifier needs .env
- `other-project.env` - As needed

---

## Security

- ✅ Repository is PRIVATE
- ✅ Only on GitHub (not public)
- ✅ Access via SSH keys
- ✅ Contains: OpenAI API, Talivy API, Google Calendar credentials

**Never make this repository public!**

---

## Troubleshooting

### Symlink broken?

```bash
ls -la ~/obs-dailynotes/.env
# If shows "No such file", recreate:
ln -s ~/dotfiles-private/obs-dailynotes.env ~/obs-dailynotes/.env
```

### Can't push to dotfiles repo?

```bash
cd ~/dotfiles-private
git remote -v
# Should show: git@github.com:Joi/dotfiles-private.git

# If wrong, update:
git remote set-url origin git@github.com:Joi/dotfiles-private.git
```

### Changes not syncing?

```bash
# On machine with changes
cd ~/dotfiles-private
git status  # See if uncommitted changes
git add obs-dailynotes.env
git commit -m "Update config"
git push

# On other machine
cd ~/dotfiles-private
git pull
```

---

**Setup complete!** Your .env now syncs across machines via private git repo.
