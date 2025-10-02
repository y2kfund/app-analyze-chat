import { AnalyzeChatProps } from './types';
declare const _default: import('vue').DefineComponent<AnalyzeChatProps, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    close: () => any;
    "update:modelValue": (value: boolean) => any;
    "conversation-added": (conversation: import('./types').Conversation) => any;
    error: (error: Error) => any;
}, string, import('vue').PublicProps, Readonly<AnalyzeChatProps> & Readonly<{
    onClose?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
    "onConversation-added"?: ((conversation: import('./types').Conversation) => any) | undefined;
    onError?: ((error: Error) => any) | undefined;
}>, {
    modelValue: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    modalRef: HTMLDivElement;
    timelineRef: HTMLDivElement;
}, HTMLDivElement>;
export default _default;
