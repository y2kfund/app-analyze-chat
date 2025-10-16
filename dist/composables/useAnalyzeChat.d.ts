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
        userId?: string | undefined;
        isFromDb?: boolean | undefined;
        api_payload?: {
            request_sent_to_openrouter: {
                model: string;
                messages: any[];
                parameters: {
                    max_tokens: number;
                    temperature: number;
                    top_p: number;
                    top_k: number;
                };
            };
            response_received_from_openrouter: {
                raw_response: any;
            };
        } | undefined;
    }[]>;
    isProcessing: import('vue').ComputedRef<boolean>;
    isLoading: import('vue').ComputedRef<boolean>;
    askQuestion: (question: string) => Promise<void>;
    clearConversations: () => Promise<void>;
    testScreenshot: () => Promise<void>;
    captureScreenshot: () => Promise<string | null>;
    loadConversations: () => Promise<void>;
    conversationsRef: Ref<Conversation[]>;
    isProcessingRef: Ref<boolean, boolean>;
};
