"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "@/lib/types";

interface UseWebSocketOptions {
  onMessage?: (message: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  connect: (url: string) => void;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 2000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  // Use refs to always have latest callbacks
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    reconnectCountRef.current = 0;
  }, []);

  const connect = useCallback(
    (url: string) => {
      urlRef.current = url;
      setIsConnecting(true);
      setError(null);

      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectCountRef.current = 0;
        onOpenRef.current?.();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        onCloseRef.current?.();

        // Attempt reconnection
        if (
          urlRef.current &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current++;
          setTimeout(() => {
            if (urlRef.current) {
              connect(urlRef.current);
            }
          }, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        setError("WebSocket connection error");
        onErrorRef.current?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          onMessageRef.current?.(message);
        } catch {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };
    },
    [reconnectAttempts, reconnectInterval]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
  };
}
