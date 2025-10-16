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
    headers = {},
    supabaseClient = null,
    user = null,
    enableDatabase = !!supabaseClient
  } = config

  const conversations = ref<Conversation[]>([])
  const isProcessing = ref(false)
  const isLoading = ref(false)

  // Check if database storage is available
  const canUseDatabase = () => {
    return enableDatabase && supabaseClient && user?.id
  }

  // Load conversations from database or localStorage
  const loadConversations = async () => {
    if (canUseDatabase()) {
      await loadFromDatabase()
    } else {
      loadFromLocalStorage()
    }
  }

  // Load from Supabase database
  const loadFromDatabase = async () => {
    if (!supabaseClient || !user?.id) return
    
    isLoading.value = true
    try {
      console.log('[AnalyzeChat] Loading conversations from database...')
      
      const { data, error } = await supabaseClient
        .schema('hf')
        .from('ai_conversations_new')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      conversations.value = data.map((conv: any) => ({
        id: conv.id,
        question: conv.question,
        response: conv.response,
        screenshot: conv.screenshot_url,
        timestamp: new Date(conv.created_at),
        loading: false,
        error: null,
        userId: conv.user_id,
        isFromDb: true
      }))
      
      console.log(`[AnalyzeChat] Loaded ${conversations.value.length} conversations from database`)
    } catch (error) {
      console.error('[AnalyzeChat] Error loading from database:', error)
      // Fallback to localStorage
      loadFromLocalStorage()
    } finally {
      isLoading.value = false
    }
  }

  // Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        conversations.value = parsed.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
          isFromDb: false
        }))
        console.log(`[AnalyzeChat] Loaded ${conversations.value.length} conversations from localStorage`)
      }
    } catch (error) {
      console.error('[AnalyzeChat] Error loading from localStorage:', error)
    }
  }

  // Save to localStorage
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conversations.value))
    } catch (error) {
      console.error('[AnalyzeChat] Error saving to localStorage:', error)
    }
  }

  // Upload screenshot to Supabase Storage
  const uploadScreenshot = async (
    base64: string,
    conversationId: string,
    userId: string
  ): Promise<string> => {
    if (!supabaseClient) {
      console.warn('[AnalyzeChat] No Supabase client, cannot upload screenshot')
      return base64
    }

    try {
      console.log('[AnalyzeChat] Uploading screenshot to Supabase Storage...')

      // Convert base64 to blob
      const response = await fetch(base64)
      const blob = await response.blob()

      // Create file path: {user_id}/{conversation_id}.jpg
      const filePath = `${userId}/${conversationId}.jpg`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseClient.storage
        .from('ai-screenshots')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('[AnalyzeChat] Screenshot upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data } = supabaseClient.storage
        .from('ai-screenshots')
        .getPublicUrl(filePath)

      console.log('[AnalyzeChat] Screenshot uploaded successfully:', data.publicUrl)
      return data.publicUrl
    } catch (error) {
      console.error('[AnalyzeChat] Screenshot upload failed:', error)
      return base64 // Fallback to base64
    }
  }

  // Save conversation to database
  const saveConversationToDatabase = async (conversation: Conversation): Promise<boolean> => {
    if (!supabaseClient || !user?.id) {
      console.warn('[AnalyzeChat] Cannot save to database: missing supabaseClient or user')
      return false
    }

    try {
      console.log('[AnalyzeChat] Saving conversation to database...')

      // Upload screenshot first if it's base64
      let screenshotUrl = conversation.screenshot
      if (screenshotUrl && screenshotUrl.startsWith('data:')) {
        screenshotUrl = await uploadScreenshot(screenshotUrl, conversation.id, user.id)
      }

      // Insert into database
      const { error } = await supabaseClient
        .schema('hf')
        .from('ai_conversations_new')
        .insert({
          id: conversation.id,
          user_id: user.id,
          question: conversation.question,
          response: conversation.response,
          screenshot_url: screenshotUrl
        })

      if (error) {
        console.error('[AnalyzeChat] Database insert error:', error)
        throw error
      }

      // Update local state with uploaded URL
      const index = conversations.value.findIndex(c => c.id === conversation.id)
      if (index !== -1) {
        conversations.value[index].screenshot = screenshotUrl
        conversations.value[index].isFromDb = true
        conversations.value[index].userId = user.id
      }

      console.log('[AnalyzeChat] Conversation saved to database successfully')
      return true
    } catch (error) {
      console.error('[AnalyzeChat] Failed to save conversation to database:', error)
      return false
    }
  }

  // Helper to safely get className as string
  const getClassNameString = (element: Element): string => {
    try {
      // Handle SVGAnimatedString and other non-string className types
      const className = element.className
      if (typeof className === 'string') {
        return className
      }
      if (className && typeof className === 'object' && 'baseVal' in className) {
        return (className as any).baseVal || ''
      }
      return ''
    } catch {
      return ''
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
                try {
                  const className = getClassNameString(element)
                  
                  return (
                    className.includes('modal') ||
                    className.includes('overlay') ||
                    className.includes('analyze-chat') ||
                    className.includes('dropdown') ||
                    className.includes('tooltip') ||
                    element.getAttribute('role') === 'dialog'
                  )
                } catch (error) {
                  console.warn('[AnalyzeChat] Error checking element in ignoreElements:', error)
                  return false
                }
              },
              onclone: (clonedDoc) => {
                // Remove problematic CSS that html2canvas can't parse
                try {
                  console.log('[AnalyzeChat] Cleaning CSS in cloned document...')
                  
                  // Get all style elements
                  const styles = clonedDoc.querySelectorAll('style')
                  console.log(`[AnalyzeChat] Found ${styles.length} style elements`)
                  
                  styles.forEach((style, index) => {
                    if (style.textContent) {
                      const originalLength = style.textContent.length
                      
                      // More aggressive replacement of modern CSS color functions
                      style.textContent = style.textContent
                        // Remove color() function with any content including nested parentheses
                        .replace(/color\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/gi, '#000000')
                        .replace(/color-mix\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/gi, '#000000')
                        .replace(/lab\s*\([^)]*\)/gi, '#000000')
                        .replace(/lch\s*\([^)]*\)/gi, '#000000')
                        .replace(/oklab\s*\([^)]*\)/gi, '#000000')
                        .replace(/oklch\s*\([^)]*\)/gi, '#000000')
                        // Remove any remaining color() functions even if malformed
                        .replace(/color\s*\(/gi, 'rgb(0,0,0 /*')
                      
                      const newLength = style.textContent.length
                      if (originalLength !== newLength) {
                        console.log(`[AnalyzeChat] Style ${index}: cleaned ${originalLength - newLength} chars`)
                      }
                    }
                  })
                  
                  // Also check and clean inline styles
                  const elementsWithStyle = clonedDoc.querySelectorAll('[style]')
                  elementsWithStyle.forEach(element => {
                    const styleAttr = element.getAttribute('style')
                    if (styleAttr && /color\s*\(/i.test(styleAttr)) {
                      const cleaned = styleAttr
                        .replace(/color\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/gi, '#000000')
                        .replace(/lab\s*\([^)]*\)/gi, '#000000')
                        .replace(/lch\s*\([^)]*\)/gi, '#000000')
                      element.setAttribute('style', cleaned)
                      console.log('[AnalyzeChat] Cleaned inline style')
                    }
                  })
                  
                  console.log('[AnalyzeChat] CSS cleaning completed')
                } catch (error) {
                  console.error('[AnalyzeChat] Error cleaning CSS:', error)
                }
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
              foreignObjectRendering: false,
              onclone: (clonedDoc) => {
                // Remove problematic CSS
                try {
                  console.log('[AnalyzeChat] Cleaning CSS in fallback cloned document...')
                  const styles = clonedDoc.querySelectorAll('style')
                  styles.forEach(style => {
                    if (style.textContent) {
                      style.textContent = style.textContent
                        .replace(/color\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/gi, '#000000')
                        .replace(/color-mix\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/gi, '#000000')
                        .replace(/lab\s*\([^)]*\)/gi, '#000000')
                        .replace(/lch\s*\([^)]*\)/gi, '#000000')
                        .replace(/oklab\s*\([^)]*\)/gi, '#000000')
                        .replace(/oklch\s*\([^)]*\)/gi, '#000000')
                        .replace(/color\s*\(/gi, 'rgb(0,0,0 /*')
                    }
                  })
                  console.log('[AnalyzeChat] Fallback CSS cleaning completed')
                } catch (error) {
                  console.error('[AnalyzeChat] Error cleaning CSS in fallback:', error)
                }
              }
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
  const askQuestion = async (question: string, preCapturedScreenshot: string | null = null, id: string | null = null) => {
    if (isProcessing.value || !question.trim()) return
    
    console.log('[AnalyzeChat] Starting AI question process...')
    isProcessing.value = true
    
    // Create conversation entry with loading state (use UUID)
    const conversation: Conversation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      question: question.trim(),
      response: '',
      screenshot: preCapturedScreenshot,
      timestamp: new Date(),
      loading: true,
      error: null,
      userId: user?.id
    }
    
    // Add to UI immediately for instant feedback
    conversations.value.unshift(conversation)
    
    try {
      
      // Capture screenshot if enabled
      let screenshot = conversation.screenshot; // pre-supplied URL or null

      if (!screenshot) {
        console.log('[AnalyzeChat] Capturing screenshot...')
        screenshot = await captureScreenshot()
      } else {
        console.log('[AnalyzeChat] Using pre-captured screenshot from function argument.')
      }
      conversation.screenshot = screenshot
      // if (screenshot) {
      //   conversation.screenshot = screenshot
      //   console.log('[AnalyzeChat] Screenshot captured and stored successfully')
      // } else if (captureScreenshots) {
      //   console.warn('[AnalyzeChat] Screenshot capture failed, proceeding without screenshot')
      // }
      
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
      
      console.log('[AnalyzeChat] Sending request to AI API...', payload)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      })
      
      // Check if API returned 200 OK
      if (!response.ok) {
        const errorText = await response.text()
        const errorMsg = `AI API Error: ${response.status} - ${errorText}`
        console.error('[AnalyzeChat]', errorMsg)
        
        // Show alert to user
        alert(`❌ Failed to get AI response\n\n${errorMsg}\n\nPlease try again.`)
        
        throw new Error(errorMsg)
      }
      
      const data = await response.json()
      console.log('[AnalyzeChat] AI response received:', data)
      
      conversation.response = data.response || 'Sorry, I could not process your request.'
      conversation.loading = false
      // console.log("DB", conversation,supabaseClient, user);
      
        if (preCapturedScreenshot && id){
          const { error } = await supabaseClient
          .schema('hf')
          .from('ai_conversations_new')
          .insert({
            id: conversation.id,
            parent_id: id,
            user_id: user.id,
            question: conversation.question,
            response: conversation.response,
            screenshot_url: preCapturedScreenshot
          })

        if (error) {
          console.error('[AnalyzeChat] Database insert error:', error)
          throw error
        }
      }
      else
      {
        // ✅ ONLY save to database if API returned 200 OK
      if (canUseDatabase()) {
        const saved = await saveConversationToDatabase(conversation)
        if (!saved) {
          console.warn('[AnalyzeChat] Database save failed, falling back to localStorage')
          saveToLocalStorage()
        }
      } else {
        // Save to localStorage if database not available
        saveToLocalStorage()
      }
      }
      
      
    } catch (error) {
      console.error('[AnalyzeChat] Error in askQuestion:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response. Please try again.'
      conversation.error = errorMessage
      conversation.loading = false
      
      // Show alert to user for API errors
      if (!conversation.error.includes('API Error')) {
        alert(`❌ Error: ${errorMessage}`)
      }
      
      // Save error state to localStorage (not database)
      saveToLocalStorage()
    }
    
    isProcessing.value = false
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
  const clearConversations = async () => {
    if (canUseDatabase() && supabaseClient && user?.id) {
      try {
        console.log('[AnalyzeChat] Clearing conversations from database...')
        const { error } = await supabaseClient
          .schema('hf')
          .from('ai_conversations_new')
          .delete()
          .eq('user_id', user.id)
        
        if (error) {
          console.error('[AnalyzeChat] Error clearing database:', error)
          throw error
        }
        console.log('[AnalyzeChat] Database conversations cleared')
      } catch (error) {
        console.error('[AnalyzeChat] Failed to clear database:', error)
      }
    }
    
    // Always clear localStorage and local state
    localStorage.removeItem(storageKey)
    conversations.value = []
    console.log('[AnalyzeChat] Conversations cleared')
  }

  // Initialize conversations on creation
  loadConversations()

  return {
    conversations: computed(() => conversations.value),
    isProcessing: computed(() => isProcessing.value),
    isLoading: computed(() => isLoading.value),
    askQuestion,
    clearConversations,
    testScreenshot,
    captureScreenshot,
    // Export refs for advanced usage
    conversationsRef: conversations as Ref<Conversation[]>,
    isProcessingRef: isProcessing
  }
}
