import { PlusIcon } from "lucide-react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
} from "@/styles/aria-fabricator/ui/chat-input"

export function ChatInputDisabled() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput disabled>
        <ChatInputTextarea placeholder="Sign in to send messages" />
        <ChatInputFooter>
          <ChatInputTools>
            <ChatInputButton aria-label="Add to message" disabled>
              <PlusIcon />
            </ChatInputButton>
          </ChatInputTools>
          <ChatInputActions>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
