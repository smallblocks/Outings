import { VersionInfo } from '@start9labs/start-sdk'

export const v_1_0_0 = VersionInfo.of({
  version: '1.0.5:0',
  releaseNotes: {
    en_US:
      'Switch SearXNG client from JSON API to HTML scraping. The StartOS ' +
      'SearXNG package does not expose the search.formats config field, so ' +
      'JSON-format requests return 403 with no way for users to fix it. ' +
      'HTML scraping works on every vanilla SearXNG install. Self-signed ' +
      'TLS toggle preserved.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
