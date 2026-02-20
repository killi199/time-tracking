---
trigger: always_on
---

# Agent Development Guide

This documentation provides guidelines for AI agents and developers working on the `time-tracking` project. Follow these rules to ensure consistency and maintainability.

## 1. Project Overview

- **Type**: Mobile Application
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **State Management**: React Context & Hooks
- **Navigation**: React Navigation

## 2. Core Technologies & Rules

### UI Components: React Native Paper

**Rule**: You MUST use `react-native-paper` for all UI elements to maintain the Material Design 3 aesthetic.

- **Typography**: Always use `react-native-paper`'s `<Text variant="...">` for consistent typography.
- **Theming**: Access the theme using `useTheme()` from `react-native-paper`.
    - implementation location: `src/context/ThemeContext.tsx`
- **Example**:

    ```tsx
    // ✅ GOOD
    import { Button, Text, TextInput, useTheme } from 'react-native-paper'

    const MyComponent = () => {
        const theme = useTheme()
        return (
            <Button mode="contained" buttonColor={theme.colors.primary}>
                <Text variant="labelLarge">{t('save')}</Text>
            </Button>
        )
    }
    ```

### Localization: react-i18next

**Rule**: All user-facing text MUST be internationalized.

- **Path**: Translation files are located in `src/i18n/locales/` (e.g., `en.ts`, `de.ts`).
- **Usage**: Use the `useTranslation` hook.
- **Never** hardcode strings in the UI.
- **Adding Keys**: If a key is missing, add it to both `en.ts` and `de.ts` (fallback to English if German is unknown).
- **Example**:
    ```tsx
    // ✅ GOOD
    const { t } = useTranslation()
    return <Text>{t('home.welcome')}</Text>
    ```

### Database: Expo SQLite

- **Path**: Database logic is central in `src/db/database.ts`.
- **Rule**: Use the existing helper functions in `database.ts` or extend it with new queries. Do not create ad-hoc database connections in components.

## 3. coding Standards

- **TypeScript**: Strictly type all props, state, and function return values. Avoid `any`.
- **Component Props**: Always create a Props interface for React components. The interface MUST be named after the file followed by `Props` (e.g., `App.tsx` -> `interface AppProps`).
- **Hooks**: Use functional components.
- **File Structure**:
    - `src/screens`: Screen components managed by navigation.
    - `src/components`: Reusable UI components.
    - `src/services`: Background tasks/services (e.g., NFC, Location).
    - `src/context`: React Context providers.
- **Restrictions**:
    - **node_modules**: Agents are NOT allowed to edit anything in the `node_modules` folder.

## 4. Workflow for Agents

1. **Analyze**: Check `package.json` and existing components for patterns.
2. **Implement**:
    - **UI**: Check `react-native-paper` docs if unsure about a component.
    - **i18n**: Check `src/i18n/locales/en.ts` for existing keys before adding new ones.
3. **Verify**: Ensure that no `react-native` primitive components are replacing `react-native-paper` components unnecessarily.

---

**Quick Checklist:**

- [ ] UI uses `react-native-paper`?
- [ ] Strings wrapped in `t()`?
- [ ] New translation keys added to `src/i18n/locales/*.ts`?
- [ ] Styles use `theme.colors`?
