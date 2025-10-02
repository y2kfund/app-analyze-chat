import { App } from 'vue';
import { default as AnalyzeChat } from './AnalyzeChat.vue';
import { useAnalyzeChat } from './composables/useAnalyzeChat';
import { Conversation, AnalyzeChatConfig, AnalyzeChatProps, AnalyzeChatEmits } from './types';
export { AnalyzeChat, useAnalyzeChat };
export type { Conversation, AnalyzeChatConfig, AnalyzeChatProps, AnalyzeChatEmits };
declare const _default: {
    install(app: App): void;
};
export default _default;
