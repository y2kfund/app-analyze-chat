import { ref, computed, type Ref } from 'vue'
import html2canvas from 'html2canvas'
import type { Conversation, AnalyzeChatConfig } from '../types'

const DEFAULT_API_URL = 'https://ai-assistant-worker.demo-cdn-v1.workers.dev/api/ai-assistant'
const DEFAULT_STORAGE_KEY = 'y2kfund-analyze-chat-conversations'

/**
 * Composable for AI chat functionality with screenshot capture
 * @param config Configuration options
 */
export function useAnalyzeChat(config: AnalyzeChatConfig = {}) {
  const {
    apiUrl = DEFAULT_API_URL,
    maxScreenshotRetries = 2,
    screenshotQuality = 0.7,
    storageKey = DEFAULT_STORAGE_KEY,
    captureScreenshots = true,
    headers = {}
  } = config

  const conversations = ref<Conversation[]>([])
  const isProcessing = ref(false)

  // Load conversations from localStorage on initialization
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        conversations.value = parsed.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp)
        }))
      }
    } catch (error) {
      console.error('[AnalyzeChat] Error loading conversations:', error)
    }
  }

  // Save conversations to localStorage
  const saveConversations = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conversations.value))
    } catch (error) {
      console.error('[AnalyzeChat] Error saving conversations:', error)
    }
  }

  // Create a simplified version of the page for screenshot
  const createScreenshotClone = (): HTMLElement => {
    const clone = document.body.cloneNode(true) as HTMLElement
    
    // Remove problematic elements
    const elementsToRemove = clone.querySelectorAll([
      '.modal-overlay',
      '[role="dialog"]',
      '.modal',
      '.popup',
      '.dropdown-menu',
      '.tooltip',
      'script',
      'style[data-vite-dev-id]', // Vite dev styles
      'link[data-vite-dev]'      // Vite dev links
    ].join(', '))
    
    elementsToRemove.forEach(el => el.remove())
    
    // Create a container with safe styling
    const container = document.createElement('div')
    container.style.cssText = `
      position: relative;
      width: ${window.innerWidth}px;
      height: ${window.innerHeight}px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #000000;
      overflow: hidden;
    `
    
    // Move clone content to container
    while (clone.firstChild) {
      container.appendChild(clone.firstChild)
    }
    
    return container
  }

  // Improved screenshot capture with CSS compatibility fixes
  const captureScreenshot = async (): Promise<string | null> => {
    if (!captureScreenshots) {
      return null
    }

    for (let attempt = 1; attempt <= maxScreenshotRetries; attempt++) {
      try {
        console.log(`[AnalyzeChat] Screenshot attempt ${attempt}/${maxScreenshotRetries}`)
        
        // Method 1: Try with original body but safer options
        if (attempt === 1) {
          // Hide modals temporarily
          const modalsAndOverlays = document.querySelectorAll([
            '.modal-overlay',
            '[role="dialog"]',
            '.modal',
            '.popup',
            '.dropdown-menu',
            '.tooltip'
          ].join(', ')) as NodeListOf<HTMLElement>
          
          const originalDisplayValues: string[] = []
          
          modalsAndOverlays.forEach((element, index) => {
            originalDisplayValues[index] = element.style.display
            element.style.display = 'none'
          })
          
          await new Promise(resolve => setTimeout(resolve, 100))
          
          try {
            const canvas = await html2canvas(document.body, {
              height: window.innerHeight,
              width: window.innerWidth,
              scrollX: 0,
              scrollY: 0,
              useCORS: true,
              allowTaint: false,
              scale: 0.5,
              logging: false,
              imageTimeout: 10000,
              removeContainer: true,
              backgroundColor: '#ffffff',
              foreignObjectRendering: false,
              ignoreElements: (element) => {
                const tagName = element.tagName.toLowerCase()
                const className = element.className || ''
                
                return (
                  tagName === 'script' ||
                  tagName === 'style' ||
                  tagName === 'link' ||
                  className.includes('modal') ||
                  className.includes('dropdown') ||
                  className.includes('tooltip') ||
                  element.getAttribute('role') === 'dialog'
                )
              }
            })
            
            // Restore modals
            modalsAndOverlays.forEach((element, index) => {
              element.style.display = originalDisplayValues[index] || ''
            })
            
            const screenshot = canvas.toDataURL('image/jpeg', screenshotQuality)
            console.log(`[AnalyzeChat] Screenshot captured successfully on attempt ${attempt}`)
            return screenshot
            
          } catch (error) {
            // Restore modals even on error
            modalsAndOverlays.forEach((element, index) => {
              element.style.display = originalDisplayValues[index] || ''
            })
            throw error
          }
        }
        
        // Method 2: Fallback with DOM cloning (safer but less accurate)
        if (attempt === 2) {
          console.log('[AnalyzeChat] Trying fallback method with DOM cloning...')
          
          const clonedElement = createScreenshotClone()
          
          // Temporarily add to document for rendering
          clonedElement.style.position = 'fixed'
          clonedElement.style.top = '-10000px'
          clonedElement.style.left = '-10000px'
          clonedElement.style.zIndex = '-1000'
          document.body.appendChild(clonedElement)
          
          try {
            const canvas = await html2canvas(clonedElement, {
              height: window.innerHeight,
              width: window.innerWidth,
              useCORS: true,
              allowTaint: false,
              scale: 0.4,
              logging: false,
              imageTimeout: 8000,
              backgroundColor: '#ffffff',
              foreignObjectRendering: false
            })
            
            document.body.removeChild(clonedElement)
            
            const screenshot = canvas.toDataURL('image/jpeg', screenshotQuality - 0.1)
            console.log(`[AnalyzeChat] Screenshot captured with fallback method`)
            return screenshot
            
          } catch (error) {
            if (document.body.contains(clonedElement)) {
              document.body.removeChild(clonedElement)
            }
            throw error
          }
        }
        
      } catch (error) {
        console.error(`[AnalyzeChat] Screenshot attempt ${attempt} failed:`, error)
        
        if (attempt === maxScreenshotRetries) {
          console.error('[AnalyzeChat] All screenshot attempts failed')
          return await createTextBasedScreenshot()
        }
        
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    
    return null
  }

  // Fallback: Create a text-based description of the page
  const createTextBasedScreenshot = async (): Promise<string> => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return ''
      
      canvas.width = 800
      canvas.height = 600
      
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Add page info as text
      ctx.fillStyle = '#000000'
      ctx.font = '16px Arial'
      ctx.fillText(`Page: ${window.location.pathname}`, 20, 40)
      ctx.fillText(`Title: ${document.title}`, 20, 70)
      ctx.fillText(`Time: ${new Date().toLocaleString()}`, 20, 100)
      ctx.fillText('Screenshot capture failed - text summary provided', 20, 140)
      
      // Try to get some visible text content
      const textContent = document.body.innerText.slice(0, 500)
      const lines = textContent.split('\n').slice(0, 20)
      
      ctx.font = '12px Arial'
      lines.forEach((line, index) => {
        if (line.trim()) {
          ctx.fillText(line.trim().slice(0, 80), 20, 180 + (index * 20))
        }
      })
      
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (error) {
      console.error('[AnalyzeChat] Text-based screenshot also failed:', error)
      return ''
    }
  }

  // Send question to AI with screenshot
  const askQuestion = async (question: string) => {
    if (isProcessing.value || !question.trim()) return
    
    console.log('[AnalyzeChat] Starting AI question process...')
    isProcessing.value = true
    
    // Create conversation entry with loading state
    const conversation: Conversation = {
      id: Date.now().toString(),
      question: question.trim(),
      response: '',
      screenshot: null,
      timestamp: new Date(),
      loading: true,
      error: null
    }
    
    conversations.value.push(conversation)
    saveConversations()
    
    try {
      console.log('[AnalyzeChat] Capturing screenshot...')
      
      // Capture screenshot if enabled
      const screenshot = await captureScreenshot()
      
      if (screenshot) {
        conversation.screenshot = screenshot
        console.log('[AnalyzeChat] Screenshot captured and stored successfully')
      } else if (captureScreenshots) {
        console.warn('[AnalyzeChat] Screenshot capture failed, proceeding without screenshot')
      }
      
      // Save conversation with screenshot
      saveConversations()
      
      // Prepare the request payload
      const payload = {
        question: conversation.question,
        screenshot: conversation.screenshot,
        timestamp: conversation.timestamp.toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        pageTitle: document.title,
        pageText: screenshot ? undefined : document.body.innerText.slice(0, 1000)
      }
      
      console.log('[AnalyzeChat] Sending request to AI API...')
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AnalyzeChat] API Error Response:', errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('[AnalyzeChat] AI response received:', data)
      
      conversation.response = data.response || 'Sorry, I could not process your request.'
      conversation.loading = false
      
    } catch (error) {
      console.error('[AnalyzeChat] Error in askQuestion:', error)
      conversation.error = error instanceof Error ? error.message : 'Failed to get response. Please try again.'
      conversation.loading = false
    }
    
    isProcessing.value = false
    saveConversations()
    
    console.log('[AnalyzeChat] AI question process completed')
  }

  // Force screenshot capture for testing
  const testScreenshot = async () => {
    console.log('[AnalyzeChat] Testing screenshot capture...')
    const screenshot = await captureScreenshot()
    if (screenshot) {
      console.log('[AnalyzeChat] Test screenshot successful')
      // Create a temporary link to download the screenshot for verification
      const link = document.createElement('a')
      link.href = screenshot
      link.download = `test-screenshot-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      console.error('[AnalyzeChat] Test screenshot failed')
    }
  }

  // Clear conversation history
  const clearConversations = () => {
    conversations.value = []
    saveConversations()
  }

  // Initialize conversations on creation
  loadConversations()

  return {
    conversations: computed(() => conversations.value),
    isProcessing: computed(() => isProcessing.value),
    askQuestion,
    clearConversations,
    testScreenshot,
    captureScreenshot,
    // Export refs for advanced usage
    conversationsRef: conversations as Ref<Conversation[]>,
    isProcessingRef: isProcessing
  }
}
