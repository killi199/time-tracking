---
trigger: always_on
---

# Agent Development Guide

This documentation provides guidelines for AI agents and developers working on the `time-tracking` project. Follow these rules to ensure consistency and maintainability.

## 1. Project Overview

- **Type**: Mobile Application
- **Framework**: Expo (React Native) — **Expo has changed**: Always check the official versioned Expo documentation (matching the SDK version in `package.json`) before writing code.
- **Language**: TypeScript
- **State Management**: React Context & Hooks
- **Navigation**: React Navigation
- **Package Registry**: Yarn

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

### React Compiler & Memoization

**Rule**: React Compiler is enabled for this project. Do NOT introduce manual memoization hooks (`useMemo`, `useCallback`, or `React.memo`) in standard React components.

- **Why**: React Compiler automatically handles memoization of components and hooks under the hood.
- **Rules & Guidelines**:
    - **Never** add manual memoization hooks in standard React Native components/screens.
    - **Synchronous Rendering (No Flash)**: When dealing with synchronous local data (e.g., SQLite database reads), perform data queries and metrics calculations directly in the render phase rather than using asynchronous `useEffect` updates. This prevents stale state flashes and intermediate blank screen rendering.

### Testing & Component Mocking Rules

- **Zero Console Errors & Warnings**: Test suites must run completely clean with 0 console warnings or errors (such as `act(...)` warnings, unhandled rejections, or unmocked native warnings).
- **Prefer Real Components**: Default to using real `react-native-paper` UI components (`Button`, `IconButton`, `Text`, `TextInput`, `Checkbox`, `Dialog`, etc.) wrapped in `<PaperProvider>`.
- **Selective Mocking**: It is acceptable to mock specific complex UI elements, subcomponents, or child views when setting up their cascading dependencies/bridges would require disproportionate effort or when isolating a screen hierarchy.
- **Generic `jestSetup.ts`**: Keep `src/test/jestSetup.ts` strictly generic and minimal for app-wide cross-cutting concerns (e.g., global `i18next` / `react-i18next` translation mocks and `@testing-library/react-native/matchers`). Do NOT add mocks into `jestSetup.ts` that only serve specific test files or screens; keep those mocks local to their respective test files.
- **User Interactions**: Use `const user = userEvent.setup()` and `await user.press(...)` / `await user.type(...)` from `@testing-library/react-native` to ensure React 19 microtasks and state updates flush properly.
- **Async State Updates & Promise Resolution**: Whenever resolving or rejecting a deferred promise manually in a test, wrap the call in `await act(() => { resolve(...) })` so React state updates flush within the test act boundary.
- **Promise Cancellation in Tests**: When mocking cancellation of async operations (e.g., NFC requests), reject/abort the active promise upon cancel rather than letting it resolve or hang, preventing background code from continuing to run and setting state after test teardown.
- **Modal & Dialog Dismissal**: When closing or dismissing `react-native-paper` `Dialog` or `Modal` components, always wait for the dismissal to complete using `await waitFor(() => { expect(screen.queryByText(...)).not.toBeOnTheScreen() })` to ensure the fade-out exit animation finishes inside the test boundary.
- **Background Tasks & Module Side Effects**: When testing screens that import services with top-level background registration or notification handlers (e.g., `LocationTask`), mock those service modules or native dependencies locally in the test file.
- **What to Mock**:
    - **Global test setup (`src/test/jestSetup.ts`)**: `i18next` / `react-i18next` translations (returns translation keys and stubbed translation hooks across all tests).
    - **Native hardware/device bridges**: `react-native-nfc-manager`, `expo-location`, `@maplibre/maplibre-react-native`, `expo-notifications`.
    - **Database queries**: `src/db/database.ts`.
    - **Navigation**: `expo-router` (`useNavigation`, `useFocusEffect`).
    - **Animation / Worklet runtimes**: Mock locally in the specific test file when using native gesture/worklet modules (`ReanimatedSwipeable`, etc.).

## 3. coding Standards

- **TypeScript Strictness**: Strictly type all props, state, variables, and function return values. Do NOT use `any`.
- **Error Handling**: Implement proper `try/catch` blocks and user-facing error messages. Never silently ignore errors or leave empty `catch` blocks.
- **ESLint**: Do NOT disable eslint rules (e.g., using `eslint-disable` or `eslint-disable-next-line`) just because it is easier. Always fix the underlying issue cleanly instead.
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
- [ ] No manual memoization (`useMemo`/`useCallback`/`React.memo`) introduced?
- [ ] Tests use real `react-native-paper` components with `<PaperProvider>` rather than artificial UI mocks?
- [ ] Tests execute cleanly with zero console warnings and zero `act(...)` errors?
- [ ] Dialog/Modal dismissals in tests are awaited with `waitFor` for clean animation teardown?
