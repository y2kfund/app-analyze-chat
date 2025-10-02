# @y2kfund/analyze-chat

AI-powered screen analysis chat component for Vue 3 applications.

## Features

- 📸 **Automatic Screenshot Capture** - Captures page screenshots with each question
- 💬 **Conversational UI** - Chat-style interface with message history
- 💾 **LocalStorage Persistence** - Conversations saved automatically
- ⚡ **Real-time AI Responses** - Powered by Cloudflare Workers
- 🎨 **Responsive Design** - Works on desktop and mobile
- ⌨️ **Keyboard Shortcuts** - Ctrl+Enter to send messages
- 🔧 **Configurable** - Customize API endpoints, storage, and more

## Installation

```bash
npm install @y2kfund/analyze-chat
```

## Usage

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'
import { AnalyzeChat } from '@y2kfund/analyze-chat'
import '@y2kfund/analyze-chat/dist/style.css'

const showChat = ref(false)
</script>

<template>
  <div>
    <button @click="showChat = true">Open AI Assistant</button>
    
    <AnalyzeChat 
      v-if="showChat"
      @close="showChat = false"
    />
  </div>
</template>
```

### With Configuration

```vue
<script setup>
import { AnalyzeChat } from '@y2kfund/analyze-chat'

const config = {
  apiUrl: 'https://your-api-endpoint.com/api',
  storageKey: 'my-app-chat-history',
  screenshotQuality: 0.8,
  captureScreenshots: true
}
</script>

<template>
  <AnalyzeChat 
    :config="config"
    @close="handleClose"
    @conversation-added="handleNewConversation"
    @error="handleError"
  />
</template>
```

### Using the Composable Directly

```vue
<script setup>
import { useAnalyzeChat } from '@y2kfund/analyze-chat'

const { conversations, isProcessing, askQuestion, clearConversations } = useAnalyzeChat({
  apiUrl: 'https://your-api.com',
  storageKey: 'custom-key'
})

async function ask() {
  await askQuestion('What is on this page?')
}
</script>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AnalyzeChatConfig` | `{}` | Configuration options |
| `initialConversations` | `Conversation[]` | `[]` | Pre-load conversations |
| `modelValue` | `boolean` | `true` | v-model support for visibility |

### Configuration Options

```typescript
interface AnalyzeChatConfig {
  apiUrl?: string                    // Default: Cloudflare Worker URL
  maxScreenshotRetries?: number      // Default: 2
  screenshotQuality?: number         // Default: 0.7 (0-1)
  storageKey?: string                // Default: 'y2kfund-analyze-chat-conversations'
  captureScreenshots?: boolean       // Default: true
  headers?: Record<string, string>   // Custom API headers
}
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | - | Emitted when modal is closed |
| `update:modelValue` | `boolean` | For v-model support |
| `conversation-added` | `Conversation` | New conversation created |
| `error` | `Error` | Error occurred |

### Composable API

```typescript
const {
  conversations,        // ComputedRef<Conversation[]>
  isProcessing,        // ComputedRef<boolean>
  askQuestion,         // (question: string) => Promise<void>
  clearConversations,  // () => void
  testScreenshot,      // () => Promise<void>
  captureScreenshot    // () => Promise<string | null>
} = useAnalyzeChat(config)
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build library
npm run build:lib

# Preview build
npm run preview
```

## Architecture

This component follows the microfrontend pattern used in the y2kfund ecosystem:

- **Standalone** - Can be used independently in any Vue 3 app
- **Lightweight** - Vue is a peer dependency (not bundled)
- **Configurable** - All settings can be customized via props
- **Type-safe** - Full TypeScript support

## License

MIT

## Related Packages

- `@y2kfund/positions` - Trading positions grid component
- `@y2kfund/summary` - Portfolio summary charts
- `@y2kfund/core` - Shared core utilities

