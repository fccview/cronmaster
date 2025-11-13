# Translation Guide

CronMaster supports internationalization (i18n) with both **unofficial custom translations** and **official translations** that can be contributed to the project.

## Table of Contents

- [Custom User Translations (Unofficial)](#custom-user-translations-unofficial)
- [Official Translations via Pull Request](#official-translations-via-pull-request)
- [Translation File Structure](#translation-file-structure)
- [Testing Your Translations](#testing-your-translations)
- [Translation Guidelines](#translation-guidelines)

## Custom User Translations (Unofficial)

You can create your own translation files locally without modifying the source code. These translations are loaded from the `./data/translations/` directory.

### Quick Setup

1. **Create the translations directory:**

   ```bash
   mkdir -p ./data/translations
   ```

2. **Copy a template:**

   ```bash
   cp app/_translations/en.json ./data/translations/your-locale.json
   ```

   **Note**: for docker users, you can copy the translation template from the [source code](https://github.com/fccview/cronmaster/blob/main/app/_translations/en.json)

3. **Set your locale:**
   ```bash
   export LOCALE=your-locale
   ```

### Step-by-Step Guide

#### 1. Prepare the Directory Structure

```bash
# Create translations directory in your data folder
mkdir -p ./data/translations

# Verify the structure
ls -la ./data/translations/
```

#### 2. Create Your Translation File

Use English as a template and create your locale file:

```bash
# Copy English template
cp app/_translations/en.json ./data/translations/fr.json

# Or for any other locale
cp app/_translations/en.json ./data/translations/es.json
cp app/_translations/en.json ./data/translations/de.json
```

#### 3. Edit Your Translation

Open your translation file and modify the values:

```bash
# Edit with your preferred editor
nano ./data/translations/fr.json
# or
code ./data/translations/fr.json
```

#### 4. Configure Environment

Set the `LOCALE` environment variable to your locale code:

```bash
# For French
export LOCALE=fr

# For Spanish
export LOCALE=es

# For German
export LOCALE=de
```

#### 5. Restart the Application

Restart CronMaster to load the new translations:

```bash
# If running with npm/yarn
npm restart
# or
yarn restart

# If using Docker
docker-compose restart cronmaster
```

### Translation Priority

Translations are loaded in this order:

1. **Custom**: `./data/translations/{locale}.json` (highest priority)
2. **Built-in**: `app/_translations/{locale}.json`
3. **Fallback**: `app/_translations/en.json` (English)

This means you can override any built-in translation by creating a custom file with the same locale code.

## Official Translations via Pull Request

To contribute an official translation to the CronMaster project, you'll need to create a pull request **targeting the `develop` branch**. All feature contributions, including translations, are merged into `develop` first before being released to `main`.

**Important:** Do not target the `main` branch directly. All pull requests should be made against `develop`.

### Prerequisites

- Basic knowledge of Git and GitHub
- Understanding of JSON format
- Familiarity with the CronMaster interface
- Accuracy in translation

### Step-by-Step Contribution Process

#### 1. Fork the Repository

```bash
# Fork the repository on GitHub
# Visit: https://github.com/fccview/cronmaster
# Click "Fork" button in the top right
```

#### 2. Clone Your Fork

```bash
# Clone your fork locally
git clone https://github.com/YOUR_USERNAME/cronmaster.git
cd cronmaster

# Add upstream remote
git remote add upstream https://github.com/fccview/cronmaster.git
```

#### 3. Create a Feature Branch

```bash
# First, ensure you're on the develop branch
git checkout develop
git pull upstream develop

# Then create and switch to a new feature branch
git checkout -b feature/add-locale-XX

# Example for Spanish:
git checkout develop
git pull upstream develop
git checkout -b feature/add-locale-es

# Example for French:
git checkout develop
git pull upstream develop
git checkout -b feature/add-locale-fr
```

#### 4. Create the Translation File

```bash
# Copy the English template
cp app/_translations/en.json app/_translations/LOCALE.json

# Replace LOCALE with your locale code (e.g., es, fr, de, it, pt, etc.)
cp app/_translations/en.json app/_translations/es.json
```

#### 5. Translate the Content

Open your translation file and translate all values:

```bash
# Edit the translation file
nano app/_translations/es.json
# or
code app/_translations/es.json
```

**Important:** Do not change the JSON keys, only translate the string values.

#### 6. Test Your Translation

```bash
# Set your locale for testing
export LOCALE=es

# Start the development server
npm run dev
# or
yarn dev

# Visit http://localhost:3000 and verify translations
```

#### 7. Commit Your Changes

```bash
# Add your translation file
git add app/_translations/es.json

# Commit with a descriptive message
git commit -m "feat: add Spanish (es) translation

- Complete Spanish translation for all UI strings
- Tested with LOCALE=es environment variable
- Follows translation guidelines and structure"
```

#### 8. Push to Your Fork

```bash
# Push your branch to GitHub
git push origin feature/add-locale-es
```

#### 9. Create a Pull Request

1. Visit your fork on GitHub
2. Click "Compare & pull request" for your branch
3. **Important:** Ensure the pull request targets the `develop` branch (not `main`)
   - The "base repository" should be `fccview/cronmaster`
   - The "base" branch should be `develop`
   - The "head repository" should be `YOUR_USERNAME/cronmaster`
   - The "compare" branch should be `feature/add-locale-XX`
4. Fill out the pull request template:

**Title:** `feat: add Spanish (es) translation`

**Description:**

```markdown
## Description

This PR adds official Spanish translation support to CronMaster.

## Changes

- Added `app/_translations/es.json` with complete Spanish translations
- All UI strings have been translated accurately
- Translation structure matches the English template

## Testing

- Tested with `LOCALE=es` environment variable
- Verified all pages and components display correctly
- No broken translations or missing keys

## Checklist

- [x] Translation is complete (all keys translated)
- [x] No JSON syntax errors
- [x] Follows translation guidelines
- [x] Tested in development environment
- [x] Commit message follows conventional format
```

#### 10. Address Review Feedback

The maintainers may request changes. Make any necessary updates:

```bash
# Make changes based on feedback
git add app/_translations/es.json
git commit -m "fix: update Spanish translations based on review feedback"
git push origin feature/add-locale-es
```

### Pull Request Requirements

Your pull request must meet these criteria:

- [ ] **Complete Translation**: All keys from `en.json` must be translated
- [ ] **Valid JSON**: No syntax errors, proper escaping
- [ ] **Accurate Translation**: Professional, accurate translations
- [ ] **Consistent Terminology**: Use consistent terms throughout
- [ ] **Cultural Adaptation**: Adapt content appropriately for the locale
- [ ] **Tested**: Verified working in the application
- [ ] **Proper Commit**: Follows conventional commit format

### Translation Standards

- Use proper grammar and punctuation
- Maintain consistent terminology
- Keep technical terms in English when appropriate
- Use appropriate formality level for the target language
- Consider cultural context and conventions
- Keep translations concise but complete

## Translation File Structure

All translation files follow this JSON structure:

```json
{
  "common": {
    "cronManagementMadeEasy": "Cron Management made easy",
    "user": "User",
    "cancel": "Cancel",
    "close": "Close"
  },
  "cronjobs": {
    "cronJobs": "Cron Jobs",
    "scheduledTasks": "Scheduled Tasks"
  },
  "scripts": {
    "bashScripts": "Bash Scripts"
  }
}
```

### Key Guidelines

- **Keys remain unchanged**: Never modify the JSON keys
- **Values are translated**: Only translate the string values
- **Hierarchy preserved**: Maintain the nested object structure
- **Data types maintained**: Keep arrays as arrays, objects as objects

## Testing Your Translations

### Development Testing

```bash
# Set your locale
export LOCALE=your-locale

# Start development server
npm run dev

# Test all pages and features:
# - Main dashboard
# - Cron job management
# - Script editor
# - Settings pages
# - Error messages
# - Modal dialogs
```

### Docker Testing

```yaml
# docker-compose.yml
services:
  cronmaster:
    environment:
      - LOCALE=your-locale
    volumes:
      - ./data/translations:/app/data/translations:ro
```

### Validation Checklist

- [ ] All pages load without errors
- [ ] No untranslated strings (should show key names if missing)
- [ ] Text fits within UI components
- [ ] Pluralization works correctly (if applicable)
- [ ] Special characters display correctly
- [ ] Date/time formats are appropriate for locale

## Translation Guidelines

### General Principles

1. **Accuracy**: Provide accurate, professional translations
2. **Consistency**: Use consistent terminology throughout
3. **Context Awareness**: Consider UI context and user expectations
4. **Cultural Sensitivity**: Adapt content appropriately for the culture
5. **Technical Precision**: Maintain technical accuracy for cron/bash concepts

### Technical Terms

Some terms should remain in English:

- "Cron" (the utility name)
- "Bash" (the shell name)
- Technical file formats (JSON, YAML, etc.)
- Command names and parameters
- Status messages that are code-related

### UI-Specific Considerations

- **Button labels**: Keep short and actionable
- **Error messages**: Clear and helpful
- **Navigation**: Consistent with user expectations
- **Date/Time**: Use locale-appropriate formats
- **Numbers**: Follow locale conventions

### Quality Assurance

Before submitting:

- Proofread all translations
- Test in context of the application
- Verify no broken JSON syntax
- Ensure all keys are translated
- Check for consistent style and tone

## Need Help?

- **Issues**: Report translation bugs or request new locales
- **Discussions**: Discuss translation approaches and guidelines
- **Discord**: Join our community for translation help

---

**Note**: This guide applies to CronMaster version 1.x and later. For older versions, translations must be contributed directly to the main repository.
