import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { setEndpoints } from '../actions/setEndpoints'
import { manageCities } from '../actions/manageCities'

export const initializeService = sdk.setupOnInit(async (effects, kind) => {
  // Seed store.json with defaults on fresh install (.catch() values fill in
  // every missing field).
  if (kind === 'install') {
    await storeJson.merge(effects, {})

    // Nudge the user to configure endpoints and cities before the calendar
    // can do anything useful.
    await sdk.action.createOwnTask(effects, setEndpoints, 'critical', {
      reason: i18n(
        'Configure vLLM and SearXNG before starting the calendar',
      ),
    })
    await sdk.action.createOwnTask(effects, manageCities, 'important', {
      reason: i18n('Add at least one city'),
    })
  }
})
