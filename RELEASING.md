# Release Process

This document describes how to create and publish a new release of Timekeeper Payroll using GitHub Actions.

## Automated Release Workflow

The project uses GitHub Actions to automatically build and release macOS DMG installers when you push a version tag.

---

## Creating a New Release

### Step 1: Update Version Numbers

Before creating a release, update the version in these files:

**1. `backend/timekeeper.spec`**
```python
info_plist={
    'CFBundleVersion': '2.0.1',           # Update this
    'CFBundleShortVersionString': '2.0.1', # Update this
    ...
}
```

**2. `backend/create_dmg.sh`**
```bash
DMG_NAME="TimekeeperPayroll-v2.0.1"  # Update this
```

**3. `frontend/package.json`**
```json
{
  "version": "2.0.1"  // Update this
}
```

**4. `frontend/src/services/http-client.js`** (if needed)
```javascript
headers['X-App-Version'] = '2.0.1'  // Update this
```

### Step 2: Test Locally

Before pushing a tag, test the build locally:

```bash
# Run the full build
./build_release.sh

# Test the DMG
open dist/TimekeeperPayroll-v2.0.1.dmg
```

Verify:
- ✅ App launches successfully
- ✅ All features work
- ✅ API connection works
- ✅ Error handling works
- ✅ Toast notifications appear

### Step 3: Commit Changes

```bash
git add .
git commit -m "chore: bump version to 2.0.1"
git push origin main
```

### Step 4: Create and Push Tag

```bash
# Create annotated tag with release notes
git tag -a v2.0.1 -m "Release v2.0.1

- Added searchable employee dropdown
- Improved error handling with toast notifications
- Fixed form validation for all application types
- Centralized error handler service
- Bug fixes and performance improvements"

# Push the tag
git push origin v2.0.1
```

### Step 5: Wait for Automated Build

GitHub Actions will automatically:

1. ✅ Detect the tag push
2. ✅ Start the build workflow
3. ✅ Build Vue.js frontend
4. ✅ Create PyInstaller macOS app bundle
5. ✅ Generate DMG installer
6. ✅ Create GitHub Release
7. ✅ Upload DMG to the release

**Monitor progress:**
- Go to: https://github.com/YOUR_USERNAME/timekeeper-payroll-v2/actions
- Click on the running workflow to see live logs

### Step 6: Verify the Release

Once the workflow completes (usually 5-10 minutes):

1. Go to: https://github.com/YOUR_USERNAME/timekeeper-payroll-v2/releases
2. Find your new release (v2.0.1)
3. Verify:
   - ✅ DMG file is attached
   - ✅ Release notes are generated
   - ✅ Download link works

### Step 7: Test Downloaded DMG

Download the DMG from the release page and test:

```bash
# Download and test
open ~/Downloads/TimekeeperPayroll-v2.0.1.dmg
```

### Step 8: Announce Release

Share the release with users:

**Release URL:**
```
https://github.com/YOUR_USERNAME/timekeeper-payroll-v2/releases/tag/v2.0.1
```

**Direct Download URL:**
```
https://github.com/YOUR_USERNAME/timekeeper-payroll-v2/releases/download/v2.0.1/TimekeeperPayroll-v2.0.1.dmg
```

---

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (v3.0.0): Breaking changes, major new features
- **MINOR** (v2.1.0): New features, backwards compatible
- **PATCH** (v2.0.1): Bug fixes, small improvements

### Examples:

- `v2.0.1` → Bug fixes
- `v2.1.0` → New feature (e.g., new module added)
- `v3.0.0` → Major rewrite or breaking changes

---

## Release Checklist

Before creating a release:

- [ ] All tests pass locally
- [ ] Version numbers updated in all files
- [ ] `./build_release.sh` works successfully
- [ ] DMG tested on your machine
- [ ] API URL points to production (not localhost)
- [ ] CHANGELOG updated (if you maintain one)
- [ ] Commit and push changes
- [ ] Create and push version tag
- [ ] Monitor GitHub Actions workflow
- [ ] Test downloaded DMG from release page
- [ ] Update documentation if needed

---

## Hotfix Releases

For urgent bug fixes:

```bash
# Create hotfix branch
git checkout -b hotfix/v2.0.2 main

# Make fixes
git add .
git commit -m "fix: critical bug in overtime module"

# Merge to main
git checkout main
git merge hotfix/v2.0.2

# Tag and release
git tag -a v2.0.2 -m "Hotfix v2.0.2 - Critical bug fix"
git push origin main
git push origin v2.0.2
```

---

## Pre-releases

For beta or release candidate versions:

```bash
# Create pre-release tag
git tag -a v2.1.0-beta.1 -m "Beta release for v2.1.0"
git push origin v2.1.0-beta.1
```

Then mark as "pre-release" in GitHub:
1. Go to the release page
2. Check "This is a pre-release"
3. Save

---

## Rollback a Release

If you need to rollback:

```bash
# Delete the tag locally
git tag -d v2.0.1

# Delete the tag remotely
git push origin :refs/tags/v2.0.1

# Delete the GitHub Release manually
# Go to Releases → Select release → Delete
```

---

## Troubleshooting

### Workflow fails at frontend build

**Problem:** `npm ci` or `npm run build` fails

**Solution:**
- Check `package-lock.json` is committed
- Ensure Node.js version matches (20)
- Look at the workflow logs for specific errors

### Workflow fails at PyInstaller step

**Problem:** PyInstaller can't find dependencies

**Solution:**
- Ensure `requirements.txt` is up to date
- Check Python version (3.10)
- Verify all imports in `timekeeper.spec`

### DMG not uploaded to release

**Problem:** Release created but DMG missing

**Solution:**
- Check workflow logs for upload step errors
- Verify DMG path matches: `dist/TimekeeperPayroll-*.dmg`
- Check `GITHUB_TOKEN` permissions

### Release notes are empty

**Problem:** Auto-generated notes don't appear

**Solution:**
- Ensure commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- Use prefixes: `feat:`, `fix:`, `chore:`, etc.

---

## Manual Release (Fallback)

If GitHub Actions fails, you can create a release manually:

```bash
# Build locally
./build_release.sh

# Create release manually on GitHub
# 1. Go to Releases
# 2. Click "Draft a new release"
# 3. Choose tag: v2.0.1
# 4. Title: "Release v2.0.1"
# 5. Upload dist/TimekeeperPayroll-v2.0.1.dmg
# 6. Click "Publish release"
```

---

## Adding Windows Support

When ready to add Windows builds:

1. Create `backend/timekeeper-windows.spec`
2. Test Windows build locally
3. Uncomment Windows job in `.github/workflows/build-release.yml`
4. Push a new tag
5. Both macOS and Windows will build automatically

---

## Useful Commands

```bash
# List all tags
git tag -l

# Show tag details
git show v2.0.1

# Delete local tag
git tag -d v2.0.1

# Delete remote tag
git push origin :refs/tags/v2.0.1

# Create tag from specific commit
git tag -a v2.0.1 <commit-hash> -m "Release v2.0.1"

# Push all tags
git push origin --tags
```

---

## Resources

- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PyInstaller Manual](https://pyinstaller.org/en/stable/)
- [Conventional Commits](https://www.conventionalcommits.org/)
