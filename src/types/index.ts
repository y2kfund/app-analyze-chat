/**
 * Represents a single conversation exchange in the AI chat
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string
  
  /** User's question */
  question: string
  
  /** AI's response */
  response: string
  
  /** Base64 encoded screenshot or URL (if captured) */
  screenshot: string | null
  
  /** When the conversation occurred */
  timestamp: Date
  
  /** Whether the AI is currently processing this conversation */
  loading: boolean
  
  /** Error message if the conversation failed */
  error: string | null
  
  /** User ID (for database storage) */
  userId?: string
  
  /** Flag indicating if conversation was loaded from database */
  isFromDb?: boolean
}

/**
 * Configuration options for the AnalyzeChat component
 */
export interface AnalyzeChatConfig {
  /** API endpoint for AI assistant. Defaults to Cloudflare Worker */
  apiUrl?: string
  
  /** Maximum number of screenshot capture retries. Default: 2 */
  maxScreenshotRetries?: number
  
  /** Screenshot quality (0-1). Default: 0.8 */
  screenshotQuality?: number
  
  /** LocalStorage key for persisting conversations. Default: 'y2kfund-analyze-chat-conversations' */
  storageKey?: string
  
  /** Whether to capture screenshots automatically with each question. Default: true */
  captureScreenshots?: boolean
  
  /** Custom headers to include in API requests */
  headers?: Record<string, string>
  
  /** Supabase client instance for database storage */
  supabaseClient?: any
  
  /** Current authenticated user object with id property */
  user?: { id: string } | null
  
  /** Enable database storage (requires supabaseClient and user). Default: true if supabaseClient provided */
  enableDatabase?: boolean
}

/**
 * Props for the AnalyzeChat component
 */
export interface AnalyzeChatProps {
  /** Configuration options */
  config?: AnalyzeChatConfig
  
  /** Initial conversations to display (useful for SSR or preloading) */
  initialConversations?: Conversation[]
  
  /** Whether the modal is initially visible */
  modelValue?: boolean
}

/**
 * Events emitted by the AnalyzeChat component
 */
export interface AnalyzeChatEmits {
  /** Emitted when the user closes the modal */
  (event: 'close'): void
  
  /** Emitted when the modal visibility changes */
  (event: 'update:modelValue', value: boolean): void
  
  /** Emitted when a new conversation is added */
  (event: 'conversation-added', conversation: Conversation): void
  
  /** Emitted when an error occurs */
  (event: 'error', error: Error): void
}
