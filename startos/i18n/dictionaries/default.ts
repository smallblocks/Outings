export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Local Outings…': 0,
  'Calendar Web UI': 1,
  'The calendar is ready': 2,
  'The calendar is not ready yet': 3,

  // interfaces.ts
  'Web UI': 4,
  'Browse the Local Outings calendar': 5,

  // actions: set-endpoints
  'Configure vLLM + SearXNG': 6,
  'Point Local Outings at your LAN vLLM server and SearXNG instance': 7,
  'vLLM Base URL': 8,
  'e.g. http://192.168.1.50:8000 — the OpenAI-compatible base URL of your vLLM server':
    9,
  'vLLM Model': 10,
  'The model identifier to use (e.g. meta-llama/Llama-3.1-8B-Instruct)': 11,
  'vLLM API Key (optional)': 12,
  'Only needed if you have put vLLM behind a reverse proxy that requires auth':
    13,
  'SearXNG Base URL': 14,
  'e.g. http://192.168.1.51:8080 — your SearXNG instance with JSON format enabled':
    15,

  // actions: manage-cities
  'Manage Cities': 16,
  'Choose which cities Local Outings should search for events': 17,
  'Cities': 18,
  'One entry per city — include state/region so search results are accurate (e.g. "Evansville, IN")':
    19,
  'City': 20,

  // actions: manage-categories
  'Manage Categories': 21,
  'Choose which kinds of events to search for': 22,
  'Categories': 23,
  'One entry per category — these are used both as search terms and as filter chips in the calendar':
    24,
  'Category': 25,

  // actions: set-schedule
  'Set Refresh Schedule': 26,
  'When should Local Outings automatically refresh the calendar?': 27,
  'Cron expression': 28,
  'Default is Sunday at 6am server time ("0 6 * * 0"). Five fields: minute hour day-of-month month day-of-week.':
    29,

  // actions: refresh-now
  'Refresh Now': 30,
  'Trigger a one-off refresh right now': 31,
  'Refresh started': 32,
  'A background refresh is now running. Events will appear in the calendar as they are found.':
    33,

  // actions: view-status
  'View Status': 34,
  'See when the calendar was last refreshed and what it found': 35,
  'Status': 36,
  'Last refresh': 37,
  'never': 38,

  // tasks
  'Configure vLLM and SearXNG before starting the calendar': 39,
  'Add at least one city': 40,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
