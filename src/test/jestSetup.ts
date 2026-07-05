/**
 * jest-expo's preset setup installs expo's winter-runtime globals (`fetch`,
 * …) as lazy properties whose first read requires expo modules. In suites
 * that mock 'react-native', that first read only happens after the last test,
 * when jest has already torn the module registry down — producing
 * "Cannot log after tests are done" warnings. Reading the global here
 * resolves it while the runtime is still alive.
 */
if (typeof globalThis.fetch !== 'function') {
    throw new Error('expected the jest-expo setup to install a fetch global')
}
