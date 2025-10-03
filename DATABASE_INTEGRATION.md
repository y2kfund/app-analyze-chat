# Database Integration Guide

## ✅ Completed Setup

### 1. Supabase Storage Bucket
- **Bucket Name:** `ai-screenshots`
- **Access:** Public read, authenticated write
- **Structure:** `{user_id}/{conversation_id}.jpg`

### 2. Database Table
- **Schema:** `hf`
- **Table:** `ai_conversations`
- **Columns:**
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to auth.users)
  - `question` (TEXT)
  - `response` (TEXT)
  - `screenshot_url` (TEXT)
  - `created_at` (TIMESTAMPTZ)

### 3. Row Level Security (RLS)
- ✅ Users can only view their own conversations
- ✅ Users can only insert their own conversations
- ✅ Users can only delete their own conversations

---

## 🔌 How to Use in Dashboard

### Step 1: Import Supabase Client and User

```typescript
import { AnalyzeChat } from '@y2kfund/analyze-chat'
import { useSupabase } from '@/composables/useSupabase'
import { useAuth } from '@/composables/useAuth'

const supabase = useSupabase()
const { user } = useAuth()
```

### Step 2: Pass Config to AnalyzeChat Component

```vue
<template>
  <AnalyzeChat 
    v-if="showAIModal"
    :config="analyzeChatConfig"
    @close="showAIModal = false"
  />
</template>

<script setup lang="ts">
const analyzeChatConfig = {
  supabaseClient: supabase,
  user: user.value,
  enableDatabase: true  // Optional, defaults to true if supabaseClient provided
}
</script>
```

---

## 🎯 Features

### ✅ Automatic Database Storage
- Conversations are automatically saved to database after successful AI API response (200 OK)
- Screenshots are uploaded to Supabase Storage
- Base64 screenshots are converted to public URLs

### ✅ Error Handling
- Alert box shows errors to user
- Console logs detailed error information
- Fallback to localStorage if database unavailable

### ✅ Guest Mode Support
- If user is not authenticated → uses localStorage
- If user logs in later → can manually migrate data

### ✅ Cross-Device Sync
- Authenticated users see conversations across devices
- Data persists beyond browser storage limits

---

## 📊 Data Flow

```
User asks question
    ↓
Capture screenshot (base64)
    ↓
Send to AI API
    ↓
✅ API returns 200 OK?
    ├─ YES → Upload screenshot to Supabase Storage
    │         ↓
    │         Save conversation to database (hf.ai_conversations)
    │         ↓
    │         Update UI with public screenshot URL
    │
    └─ NO  → Show alert to user
              ↓
              Log error to console
              ↓
              Save to localStorage only (not database)
```

---

## 🧪 Testing Checklist

### Database Storage
- [ ] Create conversation as authenticated user
- [ ] Verify row appears in `hf.ai_conversations` table
- [ ] Verify screenshot appears in `ai-screenshots` bucket
- [ ] Check screenshot URL is public and accessible
- [ ] Verify RLS policies (can't see other users' conversations)

### Error Handling
- [ ] Simulate API failure (wrong API URL)
- [ ] Verify alert box appears
- [ ] Verify error logged to console
- [ ] Verify conversation NOT saved to database
- [ ] Verify conversation saved to localStorage

### Guest Mode
- [ ] Log out
- [ ] Create conversation
- [ ] Verify saved to localStorage only
- [ ] Log in
- [ ] Verify conversations load from database

### Cross-Device
- [ ] Create conversation on Device A
- [ ] Open same account on Device B
- [ ] Verify conversation appears

---

## 🔧 Configuration Options

```typescript
interface AnalyzeChatConfig {
  // Required for database storage
  supabaseClient?: any
  user?: { id: string } | null
  
  // Optional
  enableDatabase?: boolean        // Default: true if supabaseClient provided
  apiUrl?: string                 // Default: Cloudflare Worker URL
  captureScreenshots?: boolean    // Default: true
  screenshotQuality?: number      // Default: 0.7 (0-1)
  maxScreenshotRetries?: number   // Default: 2
  storageKey?: string             // Default: 'y2kfund-analyze-chat-conversations'
  headers?: Record<string, string>
}
```

---

## 📝 Important Notes

### Only Successful Responses are Saved
- Conversations are saved to database **ONLY** if AI API returns 200 OK
- Failed API calls show alert and log to console
- Error states are saved to localStorage but NOT database

### Screenshot Storage
- Screenshots are uploaded to `ai-screenshots` bucket
- Path format: `{user_id}/{conversation_id}.jpg`
- Public URLs are stored in database
- Base64 data is NOT stored in database (too large)

### Fallback Behavior
- No user authenticated → localStorage
- Database error → localStorage
- Screenshot upload fails → base64 stored temporarily

---

## 🚀 Next Steps for Dashboard Integration

1. Update `app-dashboard/src/components/AppHeader.vue`
2. Pass Supabase client and user to AnalyzeChat
3. Test with authenticated user
4. Test with guest user (should use localStorage)
5. Verify cross-device sync

---

## 📦 Build Info

- Package version: 0.1.0
- Build size: 277.67 kB
- Last commit: 9db5476
- GitHub: https://github.com/y2kfund/app-analyze-chat
