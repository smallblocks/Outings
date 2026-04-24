import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  cron: Value.text({
    name: i18n('Cron expression'),
    description: i18n(
      'Default is Sunday at 6am server time ("0 6 * * 0"). Five fields: minute hour day-of-month month day-of-week.',
    ),
    required: true,
    default: '0 6 * * 0',
    placeholder: '0 6 * * 0',
    masked: false,
    inputmode: 'text',
    patterns: [],
    minLength: null,
    maxLength: null,
  }),
})

export const setSchedule = sdk.Action.withInput(
  'set-schedule',

  async ({ effects }) => ({
    name: i18n('Set Refresh Schedule'),
    description: i18n(
      'When should Local Outings automatically refresh the calendar?',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const store = await storeJson.read().once()
    return { cron: store?.schedule.cron ?? '0 6 * * 0' }
  },

  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      schedule: { cron: input.cron.trim() || '0 6 * * 0' },
    })
  },
)
