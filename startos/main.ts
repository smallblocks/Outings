import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiPort } from './utils'
import { storeJson } from './fileModels/store.json'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Local Outings…'))

  /**
   * Bridge StartOS store.json → /data/config.json
   *
   * The StartOS actions write to store.json (via FileHelper). The Node app
   * inside the container reads /data/config.json on every HTTP request.
   * Whenever the store changes, we rewrite the config file and let the app
   * pick it up live (no daemon restart required — the refresh worker
   * re-reads config on each invocation).
   *
   * Using `.const(effects)` means this re-runs for the lifetime of the
   * container whenever the full store object changes.
   */
  const store = await storeJson.read().const(effects)

  const config = {
    vllm: {
      url: store?.vllm.url ?? '',
      apiKey: store?.vllm.apiKey ?? '',
      model: store?.vllm.model ?? '',
    },
    searxng: {
      url: store?.searxng.url ?? '',
    },
    cities: (store?.cities ?? []).map((name) => ({ name })),
    categories: store?.categories ?? [],
    schedule: { cron: store?.schedule.cron ?? '0 6 * * 0' },
  }

  const configJson = JSON.stringify(config, null, 2)

  // Build the primary daemon. The config sync runs as a oneshot that writes
  // /data/config.json before the server starts.
  const subcontainer = await sdk.SubContainer.of(
    effects,
    { imageId: 'local-outings' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'local-outings-sub',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('sync-config', {
      subcontainer,
      exec: {
        command: [
          'sh',
          '-c',
          `mkdir -p /data && cat > /data/config.json <<'EOF_LOCAL_OUTINGS_CFG'
${configJson}
EOF_LOCAL_OUTINGS_CFG`,
        ],
      },
      requires: [],
    })
    .addDaemon('server', {
      subcontainer,
      exec: { command: ['node', 'src/server.js'] },
      ready: {
        display: i18n('Calendar Web UI'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The calendar is ready'),
            errorMessage: i18n('The calendar is not ready yet'),
          }),
      },
      requires: ['sync-config'],
    })
})
