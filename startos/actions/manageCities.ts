import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value, List } = sdk

const inputSpec = InputSpec.of({
  cities: Value.list(
    List.text(
      {
        name: i18n('Cities'),
        description: i18n(
          'One entry per city — include state/region so search results are accurate (e.g. "Evansville, IN")',
        ),
        default: [],
        minLength: null,
        maxLength: null,
      },
      {
        inputmode: 'text',
        placeholder: 'Evansville, IN',
        patterns: [],
        minLength: 2,
        maxLength: null,
        masked: false,
      },
    ),
  ),
})

export const manageCities = sdk.Action.withInput(
  'manage-cities',

  async ({ effects }) => ({
    name: i18n('Manage Cities'),
    description: i18n(
      'Choose which cities Local Outings should search for events',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const store = await storeJson.read().once()
    return { cities: store?.cities ?? [] }
  },

  async ({ effects, input }) => {
    // Trim + drop blanks + dedupe
    const seen = new Set<string>()
    const cleaned = input.cities
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .filter((c) => {
        const k = c.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    await storeJson.merge(effects, { cities: cleaned })
  },
)
