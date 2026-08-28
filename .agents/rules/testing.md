---
globs: "src/**/*.test.ts,src/**/*.test.tsx"
---

# Testing & Component Mocking Rules

Guidelines for writing and maintaining tests in the `time-tracking` project.

## Core Testing Rules

- **Zero Console Errors & Warnings**: Test suites must run completely clean with 0 console warnings or errors (such as `act(...)` warnings, unhandled rejections, or unmocked native warnings).
- **Prefer Real Components**: Default to using real `react-native-paper` UI components (`Button`, `IconButton`, `Text`, `TextInput`, `Checkbox`, `Dialog`, etc.) wrapped in `<PaperProvider>`.
- **Selective Mocking**: It is acceptable to mock specific complex UI elements, subcomponents, or child views when setting up their cascading dependencies/bridges would require disproportionate effort or when isolating a screen hierarchy.
- **Generic `jestSetup.ts`**: Keep `src/test/jestSetup.ts` strictly generic and minimal for app-wide cross-cutting concerns (e.g., global `i18next` / `react-i18next` translation mocks and `@testing-library/react-native/matchers`). Do NOT add mocks into `jestSetup.ts` that only serve specific test files or screens; keep those mocks local to their respective test files.
- **User Interactions**: Use `const user = userEvent.setup()` and `await user.press(...)` / `await user.type(...)` from `@testing-library/react-native` to ensure React 19 microtasks and state updates flush properly.
- **Async State Updates & Promise Resolution**: Whenever resolving or rejecting a deferred promise manually in a test, wrap the call in `await act(() => { resolve(...) })` so React state updates flush within the test act boundary.
- **Promise Cancellation in Tests**: When mocking cancellation of async operations (e.g., NFC requests), reject/abort the active promise upon cancel rather than letting it resolve or hang, preventing background code from continuing to run and setting state after test teardown.
- **Modal & Dialog Dismissal**: When closing or dismissing `react-native-paper` `Dialog` or `Modal` components, always wait for the dismissal to complete using `await waitFor(() => { expect(screen.queryByText(...)).not.toBeOnTheScreen() })` to ensure the fade-out exit animation finishes inside the test boundary.
- **Background Tasks & Module Side Effects**: When testing screens that import services with top-level background registration or notification handlers (e.g., `LocationTask`), mock those service modules or native dependencies locally in the test file.

## What to Mock

- **Global test setup (`src/test/jestSetup.ts`)**: `i18next` / `react-i18next` translations (returns translation keys and stubbed translation hooks across all tests).
- **Native hardware/device bridges**: `react-native-nfc-manager`, `expo-location`, `@maplibre/maplibre-react-native`, `expo-notifications`.
- **Database queries**: `src/db/database.ts`.
- **Navigation**: `expo-router` (`useNavigation`, `useFocusEffect`).
- **Animation / Worklet runtimes**: Mock locally in the specific test file when using native gesture/worklet modules (`ReanimatedSwipeable`, etc.).

---

**Testing Checklist:**

- [ ] Tests use real `react-native-paper` components with `<PaperProvider>` rather than artificial UI mocks?
- [ ] Tests execute cleanly with zero console warnings and zero `act(...)` errors?
- [ ] Dialog/Modal dismissals in tests are awaited with `waitFor` for clean animation teardown?
