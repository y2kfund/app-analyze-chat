<template>
  <div class="dev-app">
    <header class="dev-header">
      <h1>📊 AnalyzeChat Development</h1>
      <p>Test the AI Assistant component in isolation</p>
    </header>

    <main class="dev-main">
      <div class="dev-controls">
        <button @click="showChat = true" class="btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Open AI Assistant
        </button>
        
        <div class="dev-info">
          <h3>Test Features:</h3>
          <ul>
            <li>✅ Screenshot capture</li>
            <li>✅ Chat interface</li>
            <li>✅ LocalStorage persistence</li>
            <li>✅ Responsive design</li>
            <li>✅ Keyboard shortcuts (Ctrl+Enter)</li>
          </ul>
        </div>

        <div class="demo-content">
          <h2>Sample Page Content</h2>
          <p>This is sample content that will be captured in screenshots when you ask questions.</p>
          <div class="sample-grid">
            <div class="sample-card">
              <h3>Card 1</h3>
              <p>Sample data visualization</p>
            </div>
            <div class="sample-card">
              <h3>Card 2</h3>
              <p>More sample content</p>
            </div>
            <div class="sample-card">
              <h3>Card 3</h3>
              <p>Additional information</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- AnalyzeChat Component -->
    <AnalyzeChat 
      v-if="showChat"
      @close="showChat = false"
      @conversation-added="handleConversationAdded"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AnalyzeChat } from '../src'
import type { Conversation } from '../src/types'

const showChat = ref(false)

const handleConversationAdded = (conversation: Conversation) => {
  console.log('New conversation:', conversation)
}

const handleError = (error: Error) => {
  console.error('AI Assistant error:', error)
  alert(`Error: ${error.message}`)
}
</script>

<style scoped>
.dev-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.dev-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dev-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #111827;
}

.dev-header p {
  margin: 0;
  color: #6b7280;
  font-size: 1.125rem;
}

.dev-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dev-controls {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
}

.dev-info {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f3f4f6;
  border-radius: 12px;
}

.dev-info h3 {
  margin: 0 0 1rem 0;
  color: #111827;
}

.dev-info ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #374151;
}

.dev-info li {
  margin: 0.5rem 0;
}

.demo-content {
  margin-top: 2rem;
}

.demo-content h2 {
  color: #111827;
  margin-bottom: 1rem;
}

.demo-content p {
  color: #6b7280;
  line-height: 1.6;
}

.sample-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.sample-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.sample-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.sample-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
}
</style>
