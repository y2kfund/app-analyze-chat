<template>
  <div class="analyze-chat-overlay" @click="handleOverlayClick">
    <div class="analyze-chat-container" ref="modalRef">
      <!-- Header -->
      <div class="analyze-chat-header">
        <h2>Analyze</h2>
        <button @click="$emit('close')" class="close-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Conversation Timeline -->
      <div class="conversation-timeline" ref="timelineRef">
        <div v-if="conversations.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <p>Ask your first question to get started!</p>
        </div>

        <div v-for="conversation in conversations" :key="conversation.id" class="conversation-item">
          <div class="conversation-question">
            <div class="message-header">
              <span class="sender">You</span>
              <span class="timestamp">{{ formatTimestamp(conversation.timestamp) }}</span>
            </div>
            <p>{{ conversation.question }}</p>
            <div v-if="conversation.screenshot" class="screenshot-preview">
              <img :src="conversation.screenshot" alt="Page screenshot" @click="showScreenshot(conversation.screenshot)">
            </div>
          </div>
          
          <div class="conversation-response">
            <div class="message-header">
              <span class="sender ai">Analyze</span>
            </div>
            <div v-if="conversation.loading" class="loading-response">
              <div class="loading-dots"></div>
              <span>Thinking...</span>
            </div>
            <div v-else-if="conversation.error" class="error-response">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{{ conversation.error }}</span>
            </div>
            <div v-else v-html="formatResponse(conversation.response)" class="response-content"></div>
          </div>
        </div>
      </div>

      <!-- Input Section -->
      <div class="input-section">
        <!-- Screenshot Preview -->
        <div class="screenshot-preview-section">
          <div class="screenshot-preview-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span v-if="isCapturingScreenshot">Capturing screenshot...</span>
            <span v-else-if="currentScreenshot">Screenshot captured</span>
            <span v-else>Preparing screenshot...</span>
          </div>
          <div v-if="isCapturingScreenshot" class="screenshot-loading">
            <div class="loading-spinner"></div>
            <span>Capturing page content...</span>
          </div>
          <div v-else-if="currentScreenshot" class="screenshot-preview-small">
            <img :src="currentScreenshot" alt="Captured screenshot" @click="showScreenshot(currentScreenshot)">
          </div>
        </div>
        <div class="input-container">
          <textarea
            v-model="currentQuestion"
            placeholder="Ask a question about what you see on the page..."
            class="question-input"
            rows="2"
            @keydown.ctrl.enter="handleSubmit"
            @keydown.meta.enter="handleSubmit"
          ></textarea>
          <button 
            @click="handleSubmit" 
            :disabled="!currentQuestion.trim() || isProcessing"
            class="submit-button"
          >
            <svg v-if="isProcessing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loading-icon">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22,2 15,22 11,13 2,9 22,2"/>
            </svg>
          </button>
        </div>        
        <p class="input-hint">Press Ctrl+Enter to send • Screenshot automatically included</p>
      </div>
    </div>

    <!-- Screenshot Modal -->
    <div v-if="selectedScreenshot" class="screenshot-modal-overlay" @click="closeScreenshotModal">
      <div class="screenshot-modal-content">
        <img :src="selectedScreenshot" alt="Full screenshot" @click.stop>
        <button class="screenshot-modal-close" @click="closeScreenshotModal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAnalyzeChat } from './composables/useAnalyzeChat'
import type { AnalyzeChatProps, AnalyzeChatEmits } from './types'

const props = withDefaults(defineProps<AnalyzeChatProps>(), {
  modelValue: true
})

const emit = defineEmits<AnalyzeChatEmits>()

const modalRef = ref<HTMLElement>()
const timelineRef = ref<HTMLElement>()
const currentQuestion = ref('')
const selectedScreenshot = ref<string | null>(null)
const currentScreenshot = ref<string | null>(null)
const isCapturingScreenshot = ref(false)

const { conversations, isProcessing, askQuestion, captureScreenshot } = useAnalyzeChat(props.config)

const handleOverlayClick = (event: Event) => {
  if (event.target === event.currentTarget) {
    emit('close')
    emit('update:modelValue', false)
  }
}

const handleSubmit = async () => {
  if (!currentQuestion.value.trim() || isProcessing.value) return
  
  const question = currentQuestion.value.trim()
  const screenshot = currentScreenshot.value // Always use the captured screenshot
  currentQuestion.value = ''
  
  try {
    await askQuestion(question, screenshot)
    
    // Emit event for new conversation
    const latestConversation = conversations.value[conversations.value.length - 1]
    if (latestConversation) {
      emit('conversation-added', latestConversation)
    }
    
    // Scroll to bottom after new message
    nextTick(() => {
      if (timelineRef.value) {
        timelineRef.value.scrollTop = timelineRef.value.scrollHeight
      }
    })
  } catch (error) {
    emit('error', error instanceof Error ? error : new Error('Unknown error'))
  }
}

const formatTimestamp = (timestamp: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(timestamp)
}

const formatResponse = (response: string) => {
  // Simple markdown-like formatting
  return response
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

const showScreenshot = (screenshot: string) => {
  selectedScreenshot.value = screenshot
}

const closeScreenshotModal = () => {
  selectedScreenshot.value = null
}

const captureScreenshotOnOpen = async () => {
  if (isCapturingScreenshot.value) return
  
  isCapturingScreenshot.value = true
  
  try {
    const screenshot = await captureScreenshot()
    if (screenshot) {
      currentScreenshot.value = screenshot
    }
  } catch (error) {
    console.error('Failed to capture screenshot on modal open:', error)
  } finally {
    isCapturingScreenshot.value = false
  }
}

// Escape key to close
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (selectedScreenshot.value) {
      closeScreenshotModal()
    } else {
      emit('close')
      emit('update:modelValue', false)
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.body.style.overflow = 'hidden'
  
  // Auto-capture screenshot when modal opens
  captureScreenshotOnOpen()
  
  // Auto-scroll to bottom on mount if there are conversations
  nextTick(() => {
    if (timelineRef.value && conversations.value.length > 0) {
      timelineRef.value.scrollTop = timelineRef.value.scrollHeight
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})

// Watch for new conversations and auto-scroll
watch(() => conversations.value.length, () => {
  nextTick(() => {
    if (timelineRef.value) {
      timelineRef.value.scrollTop = timelineRef.value.scrollHeight
    }
  })
})
</script>

<style scoped>
.analyze-chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.analyze-chat-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: calc(100vh - 2rem);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  margin: auto;
  position: relative;
}

.analyze-chat-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  flex-shrink: 0;
}

.analyze-chat-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
  flex-shrink: 0;
  width: auto;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.conversation-timeline {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
  max-height: calc(100vh - 200px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6b7280;
  text-align: center;
  min-height: 200px;
}

.empty-state svg {
  margin-bottom: 1rem;
  color: #d1d5db;
}

.conversation-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conversation-question {
  align-self: flex-end;
  max-width: 70%;
  background: #3b82f6;
  color: white;
  padding: 1rem;
  border-radius: 16px 16px 4px 16px;
}

.conversation-response {
  align-self: flex-start;
  max-width: 80%;
  background: #f3f4f6;
  color: #111827;
  padding: 1rem;
  border-radius: 16px 16px 16px 4px;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}

.sender {
  font-weight: 500;
}

.sender.ai {
  color: #059669;
  font-weight: 600;
}

.timestamp {
  font-size: 0.75rem;
}

.conversation-question p {
  margin: 0;
  line-height: 1.5;
}

.screenshot-preview {
  margin-top: 0.75rem;
}

.screenshot-preview img {
  width: 100%;
  max-width: 200px;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.screenshot-preview img:hover {
  opacity: 0.8;
}

.loading-response {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
}

.loading-dots {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-response {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
}

.response-content {
  line-height: 1.6;
}

.input-section {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.input-container {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.question-input {
  flex: 1;
  resize: none;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  background: white;
  transition: border-color 0.2s;
}

.question-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.submit-button {
  width: auto;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-button:hover:not(:disabled) {
  background: #2563eb;
}

.submit-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.screenshot-preview-section {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.screenshot-preview-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.screenshot-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  padding: 1rem;
  justify-content: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.screenshot-preview-small {
  max-width: 200px;
}

.screenshot-preview-small img {
  width: 100%;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.screenshot-preview-small img:hover {
  opacity: 0.8;
}

.input-hint {
  margin: 0.5rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.screenshot-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  backdrop-filter: blur(4px);
}

.screenshot-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screenshot-modal-content img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  object-fit: contain;
}

.screenshot-modal-close {
  position: absolute;
  top: -20px;
  right: -20px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  color: #374151;
}

.screenshot-modal-close:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .analyze-chat-overlay {
    padding: 0.5rem;
    padding-top: max(0.5rem, env(safe-area-inset-top));
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
  
  .analyze-chat-container {
    max-height: calc(100vh - 1rem);
    min-height: 300px;
  }
  
  .conversation-timeline {
    max-height: calc(100vh - 180px);
  }
  
  .conversation-question,
  .conversation-response {
    max-width: 85%;
  }
  
  .analyze-chat-header {
    padding: 1rem;
  }
  
  .input-section {
    padding: 1rem;
  }

  .screenshot-modal-overlay {
    padding: 1rem;
  }

  .screenshot-modal-content {
    max-width: 95vw;
    max-height: 95vh;
  }

  .screenshot-modal-close {
    top: -16px;
    right: -16px;
    width: 36px;
    height: 36px;
  }
}

@media (max-height: 600px) {
  .analyze-chat-container {
    max-height: calc(100vh - 1rem);
    min-height: 250px;
  }
  
  .conversation-timeline {
    max-height: calc(100vh - 160px);
  }
  
  .empty-state {
    padding: 2rem;
    min-height: 150px;
  }
}
</style>
