import { sdk } from '../sdk'
import { setEndpoints } from './setEndpoints'
import { manageCities } from './manageCities'
import { manageCategories } from './manageCategories'
import { setSchedule } from './setSchedule'
import { refreshNow } from './refreshNow'
import { viewStatus } from './viewStatus'

export const actions = sdk.Actions.of()
  .addAction(setEndpoints)
  .addAction(manageCities)
  .addAction(manageCategories)
  .addAction(setSchedule)
  .addAction(refreshNow)
  .addAction(viewStatus)
