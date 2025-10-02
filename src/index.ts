import { App } from 'vue'
import AnalyzeChat from './AnalyzeChat.vue'
import { useAnalyzeChat } from './composables/useAnalyzeChat'
import type { Conversation, AnalyzeChatConfig, AnalyzeChatProps, AnalyzeChatEmits } from './types'

// Named exports
export { AnalyzeChat, useAnalyzeChat }

// Export types
export type { Conversation, AnalyzeChatConfig, AnalyzeChatProps, AnalyzeChatEmits }

// Default export as Vue plugin
export default {
  install(app: App) {
    app.component('AnalyzeChat', AnalyzeChat)
  }
}
