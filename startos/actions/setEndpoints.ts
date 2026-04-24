import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  vllmUrl: Value.text({
    name: i18n('vLLM Base URL'),
    description: i18n(
      'e.g. http://192.168.1.50:8000 — the OpenAI-compatible base URL of your vLLM server',
    ),
    required: true,
    default: null,
    placeholder: 'http://192.168.1.50:8000',
    masked: false,
    inputmode: 'url',
    patterns: [],
    minLength: null,
    maxLength: null,
  }),
  vllmModel: Value.text({
    name: i18n('vLLM Model'),
    description: i18n(
      'The model identifier to use (e.g. meta-llama/Llama-3.1-8B-Instruct)',
    ),
    required: true,
    default: null,
    placeholder: 'meta-llama/Llama-3.1-8B-Instruct',
    masked: false,
    inputmode: 'text',
    patterns: [],
    minLength: null,
    maxLength: null,
  }),
  vllmApiKey: Value.text({
    name: i18n('vLLM API Key (optional)'),
    description: i18n(
      'Only needed if you have put vLLM behind a reverse proxy that requires auth',
    ),
    required: false,
    default: null,
    placeholder: null,
    masked: true,
    inputmode: 'text',
    patterns: [],
    minLength: null,
    maxLength: null,
  }),
  searxngUrl: Value.text({
    name: i18n('SearXNG Base URL'),
    description: i18n(
      'e.g. http://192.168.1.51:8080 — your SearXNG instance with JSON format enabled',
    ),
    required: true,
    default: null,
    placeholder: 'http://192.168.1.51:8080',
    masked: false,
    inputmode: 'url',
    patterns: [],
    minLength: null,
    maxLength: null,
  }),
})

export const setEndpoints = sdk.Action.withInput(
  'set-endpoints',

  async ({ effects }) => ({
    name: i18n('Configure vLLM + SearXNG'),
    description: i18n(
      'Point Local Outings at your LAN vLLM server and SearXNG instance',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  // Prefill from the current store
  async ({ effects }) => {
    const store = await storeJson.read().once()
    return {
      vllmUrl: store?.vllm.url ?? '',
      vllmModel: store?.vllm.model ?? '',
      vllmApiKey: store?.vllm.apiKey ?? '',
      searxngUrl: store?.searxng.url ?? '',
    }
  },

  // Save back
  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      vllm: {
        url: input.vllmUrl.trim(),
        model: input.vllmModel.trim(),
        apiKey: (input.vllmApiKey ?? '').trim(),
      },
      searxng: {
        url: input.searxngUrl.trim(),
      },
    })
  },
)
