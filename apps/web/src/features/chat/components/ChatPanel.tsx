"use client";

import * as React from "react";
import type { RepoGraph } from "@/types/graph";
import type { ChatMessage } from "../types";
import {
  SUGGESTED_PROMPTS,
  parseMessageContent,
  extractCitations,
  streamMockAnswer,
} from "../lib/mockChat";
import { CitationChip } from "./CitationChip";
import { cn } from "@/lib/utils";

export interface ChatPanelProps {
  graph: RepoGraph;
  onSelectNode: (nodeId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ChatPanel({ graph, onSelectNode, onClose, className }: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Auto-scroll to bottom on message or token update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up any running stream on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSendMessage = React.useCallback(
    async (textToSend?: string) => {
      const query = (textToSend ?? input).trim();
      if (!query || isStreaming) return;

      setInput("");

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: query,
        citations: [],
        timestamp: Date.now(),
      };

      const assistantMsgId = `asst_${Date.now()}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        citations: [],
        isStreaming: true,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let accumulated = "";
        for await (const chunk of streamMockAnswer(query, graph, controller.signal)) {
          accumulated += chunk;
          const currentCitations = extractCitations(accumulated);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: accumulated,
                    citations: currentCitations,
                    isStreaming: true,
                  }
                : msg
            )
          );
        }

        // Finalize completed message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                }
              : msg
          )
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMsgId
                ? {
                    ...message,
                    content: `Unable to finish response: ${error instanceof Error ? error.message : "Unknown error"}`,
                    isStreaming: false,
                  }
                : message
            )
          );
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      }
    },
    [input, isStreaming, graph]
  );

  function handleStop() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  }

  function handleClear() {
    handleStop();
    setMessages([]);
  }

  return (
    <div
      className={cn(
        "flex flex-col h-[min(520px,calc(100dvh-100px))] w-full sm:w-96 rounded-xl border border-border-subtle bg-surface-panel/95 backdrop-blur-md shadow-2xl overflow-hidden text-text-primary z-30 select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle bg-surface-panel shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent border border-accent/20">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              Codebase Q&A
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated border border-border-subtle text-accent">
                mock
              </span>
            </h3>
            <p className="text-[10px] text-text-muted truncate max-w-[170px]">
              {graph.repo.owner}/{graph.repo.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              title="Clear conversation"
              className="px-2 py-1 text-[11px] font-mono text-text-muted hover:text-text-primary rounded hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Clear
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              title="Close chat"
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 px-3 space-y-4">
            <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-text-primary text-xs">
                Ask anything about this repo
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                Answers cite files and symbols that light up directly on the map.
              </p>
            </div>

            {/* Quick suggested prompt pills */}
            <div className="flex flex-wrap gap-1.5 justify-center pt-2">
              {SUGGESTED_PROMPTS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="px-2.5 py-1 rounded-full bg-surface-elevated hover:bg-surface-hover border border-border-subtle hover:border-accent text-[11px] text-text-secondary hover:text-text-primary transition-all cursor-pointer text-left"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[92%]",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div
                className={cn(
                  "p-2.5 rounded-xl border text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-accent/15 border-accent/30 text-text-primary rounded-br-xs"
                    : "bg-surface-elevated/90 border-border-subtle text-text-secondary rounded-bl-xs"
                )}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="space-y-1.5">
                    {parseMessageContent(msg.content).map((part, idx) => {
                      if (part.type === "citation") {
                        return (
                          <CitationChip
                            key={`cite_${idx}_${part.nodeId}`}
                            nodeId={part.nodeId}
                            fallbackLabel={part.fallbackLabel}
                            graph={graph}
                            onSelectNode={onSelectNode}
                          />
                        );
                      }
                      return (
                        <span key={`txt_${idx}`} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      );
                    })}

                    {msg.isStreaming ? (
                      <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 animate-pulse align-middle" />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-2.5 border-t border-border-subtle bg-surface-panel shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            aria-label="Ask a question"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about architecture, routing, DB..."
            disabled={isStreaming}
            className="flex-1 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              title="Stop generation"
              className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 text-xs font-medium transition-colors cursor-pointer"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Send question"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
