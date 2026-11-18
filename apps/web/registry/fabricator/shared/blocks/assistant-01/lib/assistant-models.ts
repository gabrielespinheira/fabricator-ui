import {
  ClaudeIcon,
  GoogleGeminiIcon,
  OpenaiIcon,
  type BrandIconComponent,
} from "@fabricator-ui/icons/brands"

// The models people can pick, by provider. List the ones your API serves.

export type AssistantModel = {
  id: string
  label: string
  /** The name beside send, where the provider's logo already says whose it is. */
  short: string
  context: string
  isFast?: boolean
}

export type AssistantProvider = {
  id: string
  label: string
  icon: BrandIconComponent
  models: AssistantModel[]
}

export const ASSISTANT_PROVIDERS: AssistantProvider[] = [
  {
    id: "anthropic",
    label: "Claude",
    icon: ClaudeIcon,
    models: [
      {
        id: "claude-opus-5-5",
        label: "Claude Opus 5.5",
        short: "Opus 5.5",
        context: "1M",
      },
      {
        id: "claude-sonnet-5-5",
        label: "Claude Sonnet 5.5",
        short: "Sonnet 5.5",
        context: "1M",
      },
      {
        id: "claude-haiku-5-5",
        label: "Claude Haiku 5.5",
        short: "Haiku 5.5",
        context: "1M",
        isFast: true,
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: OpenaiIcon,
    models: [
      {
        id: "gpt-6-astra",
        label: "GPT-6 Astra",
        short: "GPT-6 Astra",
        context: "1.05M",
      },
      {
        id: "gpt-6-luna",
        label: "GPT-6 Luna",
        short: "GPT-6 Luna",
        context: "1.05M",
        isFast: true,
      },
    ],
  },
  {
    id: "google",
    label: "Gemini",
    icon: GoogleGeminiIcon,
    models: [
      {
        id: "gemini-4-argon",
        label: "Gemini 4 Argon",
        short: "Gemini 4 Argon",
        context: "1M",
      },
      {
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        short: "Gemini 3.8 Flash",
        context: "1M",
        isFast: true,
      },
    ],
  },
]

export const ASSISTANT_EFFORTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "max", label: "Max" },
]

export const DEFAULT_ASSISTANT_MODEL = "claude-opus-5-5"

export function findAssistantModel(id: string) {
  for (const provider of ASSISTANT_PROVIDERS) {
    const model = provider.models.find((entry) => entry.id === id)
    if (model) return { provider, model }
  }
  throw new Error(`Unknown model: ${id}`)
}
