import { Ref } from 'vue';
import { Conversation, AnalyzeChatConfig } from '../types';
/**
 * Composable for AI chat functionality with screenshot capture
 * @param config Configuration options
 */
export declare function useAnalyzeChat(config?: AnalyzeChatConfig): {
    conversations: import('vue').ComputedRef<{
        id: string;
        question: string;
        response: string;
        screenshot: string | null;
        timestamp: Date;
        loading: boolean;
        error: string | null;
    }[]>;
    isProcessing: import('vue').ComputedRef<boolean>;
    askQuestion: (question: string) => Promise<void>;
    clearConversations: () => void;
    testScreenshot: () => Promise<void>;
    captureScreenshot: () => Promise<string | null>;
    conversationsRef: Ref<Conversation[]>;
    isProcessingRef: Ref<boolean, boolean>;
};
