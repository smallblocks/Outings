import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { uiPort } from '../utils'

export const refreshNow = sdk.Action.withoutInput(
  'refresh-now',

  async ({ effects }) => ({
    name: i18n('Refresh Now'),
    description: i18n('Trigger a one-off refresh right now'),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    // Fire POST /api/refresh from a short-lived subcontainer in the same
    // host network as the main daemon. The API returns immediately — the
    // refresh continues in the background.
    const sub = await sdk.SubContainer.of(
      effects,
      { imageId: 'local-outings' },
      sdk.Mounts.of(),
      'refresh-now-sub',
    )
    try {
      await sub.exec([
        'node',
        '-e',
        `fetch('http://127.0.0.1:${uiPort}/api/refresh', { method: 'POST' })
           .then(r => { if (!r.ok && r.status !== 409) process.exit(1); })
           .catch(() => process.exit(1));`,
      ])
    } finally {
      await sub.destroy?.()
    }

    return {
      version: '1',
      title: i18n('Refresh started'),
      message: i18n(
        'A background refresh is now running. Events will appear in the calendar as they are found.',
      ),
      result: null,
    }
  },
)
