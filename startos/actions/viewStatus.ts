import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'

export const viewStatus = sdk.Action.withoutInput(
  'view-status',

  async ({ effects }) => ({
    name: i18n('View Status'),
    description: i18n(
      'See when the calendar was last refreshed and what it found',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const vllm = store?.vllm.url
      ? `${store.vllm.url}  (${store.vllm.model || 'no model'})`
      : 'not configured'
    const searxng = store?.searxng.url || 'not configured'
    const cityCount = store?.cities.length ?? 0
    const catCount = store?.categories.length ?? 0
    const cron = store?.schedule.cron ?? '0 6 * * 0'

    return {
      version: '1',
      title: i18n('Status'),
      message: null,
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: 'vLLM',
            description: null,
            value: vllm,
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single',
            name: 'SearXNG',
            description: null,
            value: searxng,
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single',
            name: 'Cities',
            description: null,
            value: String(cityCount),
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single',
            name: 'Categories',
            description: null,
            value: String(catCount),
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single',
            name: 'Schedule (cron)',
            description: null,
            value: cron,
            masked: false,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
