/**
 * BusinessBridge - Virtual Boardroom Chat Service
 * Handles private group communications, message persistence, authorization, and Supabase Realtime helpers.
 */

import { EnrichedBoardMessage, BoardMessageRecord } from "@/types/boardroom";
import { UserRole } from "@/types/auth";
import {
  getSupabaseServerClient,
  verifyBoardMemberOrFounder,
} from "./board-auth.helper";

export interface GetBoardMessagesOptions {
  limit?: number;
  before?: string; // ISO 8601 timestamp for pagination
}

/**
 * Realtime channel naming convention for Virtual Boardroom chat.
 */
export function getBoardChatChannelName(founderId: string): string {
  return `board-chat:${founderId}`;
}

/**
 * Fetches all board chat messages for a specific founder's boardroom chronologically.
 * Strictly verifies that currentUserId is either the founder or an active board member.
 */
export async function getBoardMessages(
  founderId: string,
  currentUserId: string,
  options?: GetBoardMessagesOptions,
  client?: any
): Promise<EnrichedBoardMessage[]> {
  if (!founderId || !currentUserId) {
    throw new Error("founderId and currentUserId are required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Authorize caller: must be founder or active board member
  const auth = await verifyBoardMemberOrFounder(founderId, currentUserId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: You must be the founder or an active board member to view messages."
    );
  }

  // 2. Fetch messages from board_messages chronologically (created_at ASC)
  const limit = options?.limit && options.limit > 0 ? options.limit : 100;

  try {
    let query = supabase
      .from("board_messages")
      .select(`
        id,
        board_id,
        founder_id,
        sender_id,
        message,
        created_at,
        profiles:sender_id (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq("founder_id", founderId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (options?.before) {
      query = query.lt("created_at", options.before);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Check if any sender profile was not joined properly
      const missingSenderIds = data
        .filter((row: any) => !row.profiles && !row.sender)
        .map((row: any) => row.sender_id);

      const profileMap = new Map<string, any>();
      if (missingSenderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role")
          .in("id", [...new Set(missingSenderIds)]);

        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      return data.map((row: any): EnrichedBoardMessage => {
        const rawSender = Array.isArray(row.profiles) ? row.profiles[0] : (row.profiles || row.sender);
        const sender = rawSender || profileMap.get(row.sender_id);

        return {
          id: row.id,
          board_id: row.board_id || null,
          founder_id: row.founder_id,
          sender_id: row.sender_id,
          message: row.message,
          created_at: row.created_at,
          sender: sender
            ? {
                id: sender.id,
                full_name: sender.full_name || "Board Member",
                email: sender.email || "",
                avatar_url: sender.avatar_url || null,
                role: (sender.role as UserRole) || "mentor",
              }
            : undefined,
        };
      });
    }

    // Fallback: If joined select failed due to relationship constraint alias in PostgREST
    const { data: rawMessages, error: fallbackError } = await supabase
      .from("board_messages")
      .select("*")
      .eq("founder_id", founderId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fallbackError) {
      console.error("[getBoardMessages] Error fetching board messages:", fallbackError);
      throw new Error(fallbackError.message || "Failed to fetch board messages.");
    }

    if (!rawMessages || rawMessages.length === 0) {
      return [];
    }

    // Batch fetch profiles for all senders
    const senderIds = [...new Set(rawMessages.map((m: any) => m.sender_id))];
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .in("id", senderIds);

    const profileMap = new Map<string, any>();
    (profileRows || []).forEach((p: any) => profileMap.set(p.id, p));

    return rawMessages.map((row: any): EnrichedBoardMessage => {
      const sender = profileMap.get(row.sender_id);
      return {
        id: row.id,
        board_id: row.board_id || null,
        founder_id: row.founder_id,
        sender_id: row.sender_id,
        message: row.message,
        created_at: row.created_at,
        sender: sender
          ? {
              id: sender.id,
              full_name: sender.full_name || "Board Member",
              email: sender.email || "",
              avatar_url: sender.avatar_url || null,
              role: (sender.role as UserRole) || "mentor",
            }
          : undefined,
      };
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Unauthorized")) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Error fetching board messages.";
    console.error("[getBoardMessages] Unhandled exception:", msg);
    throw new Error(msg);
  }
}

/**
 * Sends a message to the private boardroom chat channel.
 * Validates that sender is authorized (founder or active board member) and message length.
 */
export async function sendBoardMessage(
  founderId: string,
  senderId: string,
  message: string,
  client?: any
): Promise<EnrichedBoardMessage> {
  if (!founderId || !senderId) {
    throw new Error("founderId and senderId are required.");
  }

  const supabase = client || (await getSupabaseServerClient());

  // 1. Authorize sender: must be founder or active board member
  const auth = await verifyBoardMemberOrFounder(founderId, senderId, supabase);
  if (!auth.isAuthorized) {
    throw new Error(
      auth.error || "Unauthorized: Sender is not an authorized board member or founder."
    );
  }

  // 2. Validate message content
  const trimmed = (message || "").trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  if (trimmed.length > 4000) {
    throw new Error("Message cannot exceed 4000 characters.");
  }

  // 3. Insert into board_messages
  const { data: inserted, error: insertError } = await supabase
    .from("board_messages")
    .insert({
      founder_id: founderId,
      sender_id: senderId,
      message: trimmed,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[sendBoardMessage] Error inserting message:", insertError);
    throw new Error(insertError.message || "Failed to send board message.");
  }

  // 4. Enrich with sender profile
  let senderProfile = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .eq("id", senderId)
      .maybeSingle();

    senderProfile = profile;
  } catch {
    // Continue with minimal profile if lookup fails
  }

  return {
    id: inserted.id,
    board_id: inserted.board_id || null,
    founder_id: inserted.founder_id,
    sender_id: inserted.sender_id,
    message: inserted.message,
    created_at: inserted.created_at,
    sender: senderProfile
      ? {
          id: senderProfile.id,
          full_name: senderProfile.full_name || "Board Member",
          email: senderProfile.email || "",
          avatar_url: senderProfile.avatar_url || null,
          role: (senderProfile.role as UserRole) || "mentor",
        }
      : undefined,
  };
}

/**
 * Supabase Realtime Client Subscription Helper.
 * Client components can call this with their browser Supabase client to subscribe to live updates.
 */
export function subscribeToBoardMessages(
  supabase: any,
  founderId: string,
  handlers: {
    onInsert?: (message: BoardMessageRecord) => void;
    onUpdate?: (message: BoardMessageRecord) => void;
    onDelete?: (oldMessage: Partial<BoardMessageRecord>) => void;
    onError?: (error: Error) => void;
  }
) {
  const channelName = getBoardChatChannelName(founderId);
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "board_messages",
        filter: `founder_id=eq.${founderId}`,
      },
      (payload: any) => {
        if (payload?.new && handlers.onInsert) {
          handlers.onInsert(payload.new as BoardMessageRecord);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "board_messages",
        filter: `founder_id=eq.${founderId}`,
      },
      (payload: any) => {
        if (payload?.new && handlers.onUpdate) {
          handlers.onUpdate(payload.new as BoardMessageRecord);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "board_messages",
        filter: `founder_id=eq.${founderId}`,
      },
      (payload: any) => {
        if (payload?.old && handlers.onDelete) {
          handlers.onDelete(payload.old as Partial<BoardMessageRecord>);
        }
      }
    )
    .subscribe((status: string, err?: any) => {
      if (err && handlers.onError) {
        handlers.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
