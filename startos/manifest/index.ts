import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'local-outings',
  title: 'Local Outings',
  license: 'MIT',
  packageRepo: 'https://github.com/smallblocks/Outings',
  upstreamRepo: 'https://github.com/smallblocks/Outings',
  marketingUrl: 'https://github.com/smallblocks/Outings',
  donationUrl: null,
  docsUrls: [
    'https://github.com/smallblocks/Outings/blob/master/README.md',
  ],
  description: { short, long },
  volumes: ['main'],
  images: {
'local-outings': {
         source: {
           dockerBuild: {
             dockerfile: 'Dockerfile',
             workdir: '.',
           },
         },
         arch: ['x86_64', 'aarch64'],
       },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {},
})
