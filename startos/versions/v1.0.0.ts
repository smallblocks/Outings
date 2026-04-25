import { VersionInfo } from '@start9labs/start-sdk'

export const v_1_0_0 = VersionInfo.of({
  version: '1.0.4:0',
  releaseNotes: {
    en_US:
      'Fix: SearXNG client no longer follows HTTP→HTTPS redirects silently, ' +
      'which was causing unexpected TLS-validation errors against the user-configured URL. ' +
      'Self-signed certs supported when the user opts in. Refresh start now logs the runtime config for diagnostics.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
