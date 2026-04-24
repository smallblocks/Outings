import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const vllmSchema = z
  .object({
    url: z.string().catch(''),
    model: z.string().catch(''),
    apiKey: z.string().catch(''),
  })
  .catch(() => ({ url: '', model: '', apiKey: '' }))

const searxngSchema = z
  .object({
    url: z.string().catch(''),
  })
  .catch(() => ({ url: '' }))

const scheduleSchema = z
  .object({
    cron: z.string().catch('0 6 * * 0'), // Sunday 06:00
  })
  .catch(() => ({ cron: '0 6 * * 0' }))

export const defaultCategories = [
  'Plays & Musicals',
  'Concerts & Entertainers',
  'Baseball & Sports',
  'Festivals & Fairs',
  'Family & Kids Events',
  'Museums & Exhibits',
]

const shape = z.object({
  vllm: vllmSchema,
  searxng: searxngSchema,
  cities: z.array(z.string()).catch([]),
  categories: z.array(z.string()).catch(defaultCategories),
  schedule: scheduleSchema,
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'store.json' },
  shape,
)
