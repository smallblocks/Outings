import { VersionInfo } from '@start9labs/start-sdk'

export const v_1_0_0 = VersionInfo.of({
  version: '1.0.0:0',
  releaseNotes: {
    en_US: 'Initial release of Local Outings',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
