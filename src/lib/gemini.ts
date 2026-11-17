/**
 * BusinessBridge - Google Gemini AI Integration
 * Server-only module for advisory intelligence and AI mentor matching.
 * 
 * CRITICAL SECURITY:
 * Never import or expose this file or GEMINI_API_KEY to client components or the browser.
 */

export interface GeminiGenerateOptions {
  model?: string;
  temperature?: number;
  systemInstruction?: string;
  timeoutMs?: number;
}

/**
 * Checks if the Gemini API key is configured on the server.
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0 && key !== "undefined" && key !== "null");
}

/**
 * Retrieves the configured Gemini model name.
 * Defaults to "gemini-2.5-flash" (or "gemini-1.5-flash").
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

let genAIChecked = false;
let cachedGenAIModule: any = null;

/**
 * Dynamically attempts to load `@google/genai` if installed in node_modules.
 * Uses indirect dynamic evaluation to avoid bundler build-time resolution failures when not installed.
 */
async function loadGoogleGenAI(): Promise<any> {
  if (genAIChecked) {
    return cachedGenAIModule;
  }
  genAIChecked = true;

  try {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    cachedGenAIModule = await dynamicImport("@google/genai");
    return cachedGenAIModule;
  } catch {
    cachedGenAIModule = null;
    return null;
  }
}

/**
 * Strips markdown code blocks (```json ... ```) and extracts valid JSON string.
 */
function extractJSONString(raw: string): string {
  let cleaned = raw.trim();

  // Remove leading ```json or ```
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  // Remove trailing ```
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // If there are surrounding backticks or unwanted characters
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIndex = 0;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  let endIndex = cleaned.length;

  if (lastBrace !== -1 && lastBracket !== -1) {
    endIndex = Math.max(lastBrace, lastBracket) + 1;
  } else if (lastBrace !== -1) {
    endIndex = lastBrace + 1;
  } else if (lastBracket !== -1) {
    endIndex = lastBracket + 1;
  }

  if (startIndex >= 0 && endIndex > startIndex) {
    return cleaned.slice(startIndex, endIndex).trim();
  }

  return cleaned;
}

/**
 * Invokes the official Google Gemini REST API directly via native Node.js fetch.
 */
async function callGeminiRestAPI(
  apiKey: string,
  model: string,
  prompt: string,
  options?: GeminiGenerateOptions
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      responseMimeType: "application/json",
    },
  };

  if (options?.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const timeoutMs = options?.timeoutMs || 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let parsedError: any = null;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        // Not JSON
      }

      const status = response.status;
      const apiMessage = parsedError?.error?.message || errorText || `HTTP ${status}`;

      if (status === 429) {
        throw new Error(`Gemini API rate limit exceeded (429): ${apiMessage}`);
      }
      if (status === 401 || status === 403) {
        throw new Error(`Gemini API authentication failed (${status}): Invalid or unauthorized API key.`);
      }
      if (status === 404 && model !== "gemini-1.5-flash") {
        // Fallback retry with gemini-1.5-flash if gemini-2.5-flash is not yet enabled in project region
        console.warn(`[Gemini] Model ${model} returned 404. Attempting automatic fallback to gemini-1.5-flash...`);
        return await callGeminiRestAPI(apiKey, "gemini-1.5-flash", prompt, options);
      }

      throw new Error(`Gemini API request failed (${status}): ${apiMessage}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];

    if (!candidate) {
      throw new Error("Gemini API returned an empty candidates list.");
    }

    const textPart = candidate.content?.parts?.[0]?.text;
    if (!textPart) {
      if (candidate.finishReason && candidate.finishReason !== "STOP") {
        throw new Error(`Gemini generation stopped prematurely: ${candidate.finishReason}`);
      }
      throw new Error("Gemini API returned candidate without text content.");
    }

    return textPart;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini API request timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates raw content string using Gemini AI.
 * Dynamically checks for `@google/genai` library; otherwise falls back to native REST fetch.
 */
export async function generateContent(
  prompt: string,
  options?: GeminiGenerateOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = options?.model || getGeminiModel();

  // Step 1: Dynamic check for @google/genai module
  const genAIMod = await loadGoogleGenAI();
  if (genAIMod) {
    try {
      const GoogleGenAI = genAIMod.GoogleGenAI || genAIMod.default?.GoogleGenAI;
      if (GoogleGenAI) {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...(options?.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
            temperature: options?.temperature ?? 0.2,
            responseMimeType: "application/json",
          },
        });
        if (result?.text) {
          return result.text;
        }
      }
    } catch (sdkError: any) {
      console.warn("[Gemini] @google/genai execution error, falling back to official REST API:", sdkError?.message);
    }
  }

  // Step 2: Direct official Google Gemini REST API call
  return await callGeminiRestAPI(apiKey, model, prompt, options);
}

/**
 * Generates and parses a structured JSON response from Gemini AI.
 * Includes sanitization of markdown code fences and thorough schema parsing.
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  options?: GeminiGenerateOptions
): Promise<T> {
  const rawText = await generateContent(prompt, options);
  const cleaned = extractJSONString(rawText);

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseError: any) {
    console.error("[Gemini] Failed to parse JSON response. Raw output:", rawText);
    throw new Error(`Gemini response could not be parsed as valid JSON: ${parseError.message}`);
  }
}

export const generateGeminiContent = generateContent;

