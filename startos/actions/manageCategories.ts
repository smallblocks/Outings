import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson, defaultCategories } from '../fileModels/store.json'

const { InputSpec, Value, List } = sdk

const inputSpec = InputSpec.of({
  categories: Value.list(
    List.text(
      {
        name: i18n('Categories'),
        description: i18n(
          'One entry per category — these are used both as search terms and as filter chips in the calendar',
        ),
        default: defaultCategories,
        minLength: 1,
        maxLength: null,
      },
      {
        inputmode: 'text',
        placeholder: 'e.g. Concerts & Entertainers',
        patterns: [],
        minLength: 2,
        maxLength: null,
        masked: false,
      },
    ),
  ),
})

export const manageCategories = sdk.Action.withInput(
  'manage-categories',

  async ({ effects }) => ({
    name: i18n('Manage Categories'),
    description: i18n('Choose which kinds of events to search for'),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const store = await storeJson.read().once()
    return { categories: store?.categories ?? defaultCategories }
  },

  async ({ effects, input }) => {
    const seen = new Set<string>()
    const cleaned = input.categories
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .filter((c) => {
        const k = c.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    await storeJson.merge(effects, { categories: cleaned })
  },
)
