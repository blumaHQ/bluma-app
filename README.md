# Bluma

An offline period tracking app designed to be a delight to use whilst preserving the users’ privacy by using local-only data storage.

<img width="1024" height="500" alt="featured-graphic" src="https://github.com/user-attachments/assets/93f5ab69-a223-4287-8440-00f3d8ca6427" />

# ⚙️ Features

- Period, ovulation & fertile window predictions.
- Track symptoms, moods, flow, vaginal discharge and basal body temperature.
- Cycle averages and history.
- Cycle phase insights.
- Period and fertility reminders.
- Biometric app lock.
- Encrypted backups.
- Dark & light themes.
- Works offline - All data is stored locally and encrypted.
- No account required.
- No ads.
- No third‑party analytics or tracking.
- Open source code.

# 👩🏻‍💻 Technologies used

**Core**

- Framework: React Native with Expo SDK 54
- Database: SQLite with Drizzle ORM (Local data storage)
- Encryption: SQLCipher
- Programming language: Typescript
- Localisation: i18next / react-i18next

**Quality**

- ESLint + Prettier - Linting and formatting
- Jest (jest-expo) - Test setup (see `package.json` scripts)

**Accessibility**

- WCAG-oriented patterns - accessibilityRole, accessibilityLabel, accessibilityHint in key components
- Multiple indication methods - Color + icon + text where status is shown (e.g. calendar)

# 📄 License

Copyright © 2025 Maribel Ferreira  
This project is licensed under the [GNU General Public License v3.0](LICENSE).

You may use, modify, and distribute the software under the GPL-3.0 license. If you distribute a modified version, you must also make the corresponding source code available under the same license.
