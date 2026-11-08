export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations: string[]; // Node IDs cited in this response
  isStreaming?: boolean;
  timestamp: number;
}

export type ParsedContentPart =
  | { type: "text"; text: string }
  | { type: "citation"; nodeId: string; fallbackLabel?: string };

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
}
