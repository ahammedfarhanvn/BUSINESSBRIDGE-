"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Target,
  DollarSign,
  Briefcase,
  ShieldAlert,
  Lightbulb,
  TrendingUp,
  User,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { AICopilotMessage } from "@/types/ai-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AICopilotProps {
  startupContext?: {
    startupName?: string;
    industry?: string;
    stage?: string;
    description?: string;
    goals?: string;
  };
  className?: string;
  initialQuestion?: string;
}

interface SuggestedPrompt {
  id: string;
  category: "Fundraising" | "Board Governance" | "Unit Economics" | "Risk & Strategy" | "Pricing & GTM";
  question: string;
  icon: React.ReactNode;
}

// ============================================================================
// Curated Suggested Prompts
// ============================================================================

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "prompt-seed-val",
    category: "Fundraising",
    question: "How should I structure my seed round valuation?",
    icon: <DollarSign className="w-3.5 h-3.5 text-emerald-600" />,
  },
  {
    id: "prompt-board-metrics",
    category: "Board Governance",
    question: "What metrics should I present at my next board meeting?",
    icon: <Briefcase className="w-3.5 h-3.5 text-blue-600" />,
  },
  {
    id: "prompt-payback",
    category: "Unit Economics",
    question: "How to calculate payback period for B2B SaaS?",
    icon: <TrendingUp className="w-3.5 h-3.5 text-purple-600" />,
  },
  {
    id: "prompt-dev-risks",
    category: "Risk & Strategy",
    question: "What are common risks at product_development stage?",
    icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />,
  },
  {
    id: "prompt-pricing",
    category: "Pricing & GTM",
    question: "What pricing model is optimal for early enterprise validation?",
    icon: <Target className="w-3.5 h-3.5 text-rose-600" />,
  },
];

// Initial welcoming advisory message
const INITIAL_COPILOT_MESSAGE: AICopilotMessage = {
  id: "welcome-system-intro",
  role: "assistant",
  content: `### Executive Advisory: Welcome to BusinessBridge Copilot

**Overview**: I am your AI Business Copilot—an executive strategist and venture advisor trained to guide founders through high-stakes decisions across fundraising, board management, unit economics, and operational scaling.

**Strategic Capabilities**:
- **Fundraising & Capital Formation**: Valuation bands, SAFE vs. priced rounds, dilution modeling, and investor diligence.
- **Boardroom Governance**: Agenda setting, executive one-pagers, mentor friction alignment, and key KPI reviews.
- **Financial Architecture**: CAC/LTV payback, gross margin targets, runway optimization, and burn multiple benchmarks.
- **Product & GTM Strategy**: Pricing strategy, ideal customer profile (ICP) narrowing, and risk mitigation.

**Recommended Next Step**:
Click one of the suggested prompts above or type your strategic question below to begin your advisory session.`,
  timestamp: "Just now",
  sections: [
    {
      heading: "Strategic Advisory Pillars",
      points: [
        "Seed & Series A Valuation Structuring",
        "Virtual Boardroom Agenda & Metric Preparation",
        "B2B SaaS Payback Period & Unit Economics",
        "Stage-Specific Operational & Market Risk Mitigation",
      ],
      actionItems: [
        "Select a strategic prompt or type your query in the composer below",
        "Review tailored suggestions and assign follow-ups directly to your journey milestones",
      ],
    },
  ],
};

// ============================================================================
// Response Parsing & Formatting Helpers
// ============================================================================

/**
 * Parses markdown-like text into structured sections and blocks for display
 */
function parseResponseSections(text: string): AICopilotMessage["sections"] {
  const sections: AICopilotMessage["sections"] = [];
  const lines = text.split("\n");

  let currentHeading = "";
  let currentPoints: string[] = [];
  let currentActionItems: string[] = [];

  const flushCurrent = () => {
    if (currentHeading || currentPoints.length > 0 || currentActionItems.length > 0) {
      sections.push({
        heading: currentHeading || undefined,
        points: currentPoints.length > 0 ? [...currentPoints] : undefined,
        actionItems: currentActionItems.length > 0 ? [...currentActionItems] : undefined,
      });
      currentHeading = "";
      currentPoints = [];
      currentActionItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Detect markdown heading (###, ##, or **Heading**)
    const headingMatch = rawLine.match(/^(?:#{1,4}\s+|\*\*)([^*#:]+)(?:\*\*|:)?$/);
    const isActionSection = /action|next step|to-do|recommend/i.test(rawLine);

    if (headingMatch && !rawLine.startsWith("-") && !rawLine.startsWith("•") && !/^\d+\./.test(rawLine)) {
      flushCurrent();
      currentHeading = headingMatch[1].trim();
      continue;
    }

    // Bullet points
    const bulletMatch = rawLine.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (isActionSection || /action|step/i.test(currentHeading)) {
        currentActionItems.push(bulletMatch[1].trim());
      } else {
        currentPoints.push(bulletMatch[1].trim());
      }
      continue;
    }

    // Numbered items
    const numberedMatch = rawLine.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      if (isActionSection || /action|step|agenda/i.test(currentHeading)) {
        currentActionItems.push(numberedMatch[1].trim());
      } else {
        currentPoints.push(numberedMatch[1].trim());
      }
      continue;
    }

    // Regular line under current section
    if (currentHeading) {
      currentPoints.push(rawLine);
    }
  }

  flushCurrent();
  return sections.length > 0 ? sections : undefined;
}

/**
 * Render inline markdown elements (**bold**, `code`, *italic*)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Split by bold (**...**) and code (`...`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Structured Renderer for AI Responses
 */
function FormattedAIResponse({ content, sections }: { content: string; sections?: AICopilotMessage["sections"] }) {
  // If structured sections were parsed, render rich interactive blocks
  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        renderedElements.push(
          <ol key={key} className="space-y-2 my-2.5 pl-1">
            {listItems}
          </ol>
        );
      } else {
        renderedElements.push(
          <ul key={key} className="space-y-2 my-2.5 pl-1">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      inList = false;
      isNumberedList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList(`list-flush-${i}`);
      continue;
    }

    // 1. Heading 3 (###) or Heading 2 (##)
    if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      flushList(`list-heading-${i}`);
      const headingText = trimmed.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "");
      renderedElements.push(
        <div
          key={`h-${i}`}
          className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-base"
        >
          <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
          <h4 className="tracking-tight">{headingText}</h4>
        </div>
      );
      continue;
    }

    // 2. Bold section title with colon (e.g. **Core Perspective**: or **Strategic Considerations**:)
    const boldTitleMatch = trimmed.match(/^\*\*([^*:]+)\*\*:(.*)$/);
    if (boldTitleMatch) {
      flushList(`list-bold-${i}`);
      const title = boldTitleMatch[1].trim();
      const rest = boldTitleMatch[2].trim();

      const isExecutive = /overview|summary|perspective|core/i.test(title);
      const isAction = /action|step|next/i.test(title);

      renderedElements.push(
        <div
          key={`section-${i}`}
          className={cn(
            "mt-3 mb-2 p-3 rounded-lg border text-sm",
            isExecutive && "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40",
            isAction && "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
            !isExecutive && !isAction && "bg-muted/40 border-border"
          )}
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {isExecutive ? (
              <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : isAction ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            <span>{title}</span>
          </div>
          {rest && (
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-5">
              {renderInlineFormatting(rest)}
            </p>
          )}
        </div>
      );
      continue;
    }

    // 3. Numbered action items (e.g. 1. Audit unit economics...)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      if (!inList || !isNumberedList) {
        flushList(`list-start-num-${i}`);
        inList = true;
        isNumberedList = true;
      }
      const num = numberedMatch[1];
      const text = numberedMatch[2];
      listItems.push(
        <li key={`num-item-${i}`} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center mt-0.5 shadow-sm">
            {num}
          </span>
          <span className="leading-relaxed flex-1">{renderInlineFormatting(text)}</span>
        </li>
      );
      continue;
    }

    // 4. Bullet points (e.g. - **Milestone Sizing**: ...)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!inList || isNumberedList) {
        flushList(`list-start-bullet-${i}`);
        inList = true;
        isNumberedList = false;
      }
      const text = bulletMatch[1];
      listItems.push(
        <li key={`bullet-item-${i}`} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0 mt-2" />
          <span className="leading-relaxed flex-1">{renderInlineFormatting(text)}</span>
        </li>
      );
      continue;
    }

    // 5. Standard paragraph
    flushList(`list-para-${i}`);
    renderedElements.push(
      <p key={`p-${i}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList("list-final");

  return <div className="space-y-1">{renderedElements}</div>;
}

// ============================================================================
// Main Component
// ============================================================================

export function AICopilot({ startupContext, className, initialQuestion }: AICopilotProps) {
  // Messages state
  const [messages, setMessages] = useState<AICopilotMessage[]>([INITIAL_COPILOT_MESSAGE]);
  const [inputQuestion, setInputQuestion] = useState(initialQuestion || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPills, setShowPills] = useState(true);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isLoading, scrollToBottom]);

  // Adjust textarea height dynamically
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuestion(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  // Copy message text to clipboard
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // Reset conversation to initial state
  const handleResetChat = () => {
    setMessages([
      {
        ...INITIAL_COPILOT_MESSAGE,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setError(null);
    setLastFailedQuestion(null);
    setShowPills(true);
  };

  // Core handler to ask Copilot via secure server API endpoint
  const handleAskQuestion = async (questionToSend: string) => {
    const trimmed = questionToSend.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setLastFailedQuestion(null);

    // 1. Append user message
    const userMessage: AICopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      // Format history payload for the backend API
      const historyPayload = updatedHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Connect securely to the server endpoint; never call Gemini directly from browser!
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          history: historyPayload,
          context: startupContext || {},
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to receive advice from AI Copilot. Please try again.");
      }

      // 2. Append assistant response
      const assistantMessage: AICopilotMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sections: parseResponseSections(data.answer || ""),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errMsg);
      setLastFailedQuestion(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAskQuestion(inputQuestion);
  };

  // Keyboard shortcut: Enter sends, Shift+Enter adds newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Click on a suggested prompt pill
  const handlePillClick = (promptQuestion: string) => {
    handleAskQuestion(promptQuestion);
  };

  return (
    <Card
      className={cn(
        "flex flex-col h-full min-h-[620px] max-h-[820px] shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden",
        className
      )}
    >
      {/* ==================================================================== */}
      {/* Header                                                               */}
      {/* ==================================================================== */}
      <CardHeader className="py-4 px-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-white shadow-sm ring-1 ring-slate-900/10">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                AI Business Copilot
              </CardTitle>
              <Badge
                variant="accent"
                className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60 text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Powered by Gemini
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strategic executive advisory, financial unit economics & board governance
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {startupContext?.startupName && (
            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-normal border-slate-300">
              {startupContext.startupName}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetChat}
            className="h-8 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span className="hidden md:inline">New Session</span>
          </Button>
        </div>
      </CardHeader>

      {/* ==================================================================== */}
      {/* Suggested Question Pills                                             */}
      {/* ==================================================================== */}
      {showPills && (
        <div className="px-6 py-3 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-emerald-600" />
              Suggested Strategic Prompts:
            </span>
            <button
              onClick={() => setShowPills(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handlePillClick(prompt.question)}
                disabled={isLoading}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all text-left",
                  "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700",
                  "hover:border-emerald-500/80 hover:bg-emerald-50/40 dark:hover:bg-slate-800/80 hover:text-slate-900 shadow-sm",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                {prompt.icon}
                <span>{prompt.question}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Message Thread                                                       */}
      {/* ==================================================================== */}
      <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-slate-50/20 dark:bg-slate-950/40">
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={cn("flex items-start gap-3 w-full", isUser ? "justify-end" : "justify-start")}
            >
              {/* Assistant Avatar */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ring-1 ring-slate-200 dark:ring-slate-700">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  "flex flex-col relative group transition-all",
                  isUser
                    ? "items-end max-w-[85%] md:max-w-[75%]"
                    : "items-start max-w-[94%] md:max-w-[85%]"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3.5 shadow-sm transition-colors",
                    isUser
                      ? "bg-slate-900 text-white dark:bg-slate-800 rounded-tr-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm"
                  )}
                >
                  {/* Assistant Header Info */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Copilot Advisory
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                          Verified Framework
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>{message.timestamp}</span>
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <p className="text-sm text-white dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : (
                    <FormattedAIResponse content={message.content} sections={message.sections} />
                  )}
                </div>

                {/* User Timestamp */}
                {isUser && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                    {message.timestamp}
                  </span>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <Avatar className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 mt-1 flex-shrink-0">
                  <AvatarFallback className="bg-slate-800 text-white text-xs font-medium">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {/* Loading State / Thinking Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 w-full justify-start animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm max-w-[85%]">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Synthesizing business intelligence & strategy...
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 pl-6">
                Consulting valuation models, governance protocols, and benchmark SaaS metrics.
              </p>
            </div>
          </div>
        )}

        {/* Error State with Clear Retry Button */}
        {error && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {lastFailedQuestion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAskQuestion(lastFailedQuestion)}
                disabled={isLoading}
                className="h-7 text-xs border-rose-300 hover:bg-rose-100 text-rose-800 dark:border-rose-800 dark:hover:bg-rose-900/60"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* ==================================================================== */}
      {/* Input Composer                                                       */}
      {/* ==================================================================== */}
      <div className="p-3 md:p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
          <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-600 transition-all">
            <Textarea
              ref={textareaRef}
              value={inputQuestion}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about valuation, board governance, unit economics, fundraising, or hiring..."
              disabled={isLoading}
              rows={1}
              className="resize-none min-h-[46px] max-h-36 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
            <Button
              type="submit"
              disabled={!inputQuestion.trim() || isLoading}
              className={cn(
                "h-9 px-4 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0 mb-0.5",
                "bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Ask Copilot</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>
              Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Enter</kbd> to send,{" "}
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Shift + Enter</kbd> for new line
            </span>
            <span className="hidden sm:inline">All queries are evaluated with founder context</span>
          </div>
        </form>
      </div>
    </Card>
  );
}
