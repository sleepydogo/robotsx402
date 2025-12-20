'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Video, RefreshCw, AlertCircle } from 'lucide-react';

interface VideoStreamProps {
  streamUrl: string;
  title?: string;
  showHeader?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  height?: string;
}

export default function VideoStream({
  streamUrl,
  title = "Robot Camera Feed",
  showHeader = true,
  autoReconnect = true,
  reconnectInterval = 5000, // 5 seconds
  height
}: VideoStreamProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear reconnect timer on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    setReconnectAttempts(0);
  };

  // Handle iframe error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);

    if (autoReconnect) {
      attemptReconnect();
    }
  };

  // Attempt to reconnect
  const attemptReconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);

      // Force iframe reload by changing src
      if (iframeRef.current) {
        const currentSrc = iframeRef.current.src;
        iframeRef.current.src = '';
        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = currentSrc;
          }
        }, 100);
      }
    }, reconnectInterval);
  };

  // Manual reconnect
  const handleManualReconnect = () => {
    setReconnectAttempts(0);
    attemptReconnect();
  };

  // Monitor iframe for black screen (visibility check)
  useEffect(() => {
    if (!autoReconnect) return;

    const checkInterval = setInterval(() => {
      // After 30 seconds of loading, if still loading, try to reconnect
      if (isLoading && !hasError) {
        const loadTime = Date.now();
        if (loadTime > 30000) {
          handleError();
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [isLoading, hasError, autoReconnect]);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-5 h-5 text-neon-cyan" />
          <h3 className="text-white font-semibold font-mono">{title}</h3>
          <div className="ml-auto flex items-center gap-2">
            {isLoading ? (
              <>
                <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                <span className="text-xs text-yellow-400 font-mono">CONNECTING...</span>
              </>
            ) : hasError ? (
              <>
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-red-400 font-mono">ERROR</span>
                <button
                  onClick={handleManualReconnect}
                  className="ml-2 px-2 py-0.5 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-red-300 transition-all"
                >
                  RETRY
                </button>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                <span className="text-xs text-red-400 font-mono">LIVE</span>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="bg-black rounded-lg overflow-hidden border border-white/10 relative"
        style={height ? { height } : { aspectRatio: '16/9' }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-mono">Loading stream...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center max-w-xs px-4">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-400 font-mono mb-2">Stream Unavailable</p>
              <p className="text-xs text-gray-500 mb-4">
                {autoReconnect
                  ? `Reconnecting... (Attempt ${reconnectAttempts})`
                  : 'Unable to load video stream'}
              </p>
              <button
                onClick={handleManualReconnect}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 transition-all text-sm font-mono"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                RECONNECT
              </button>
            </div>
          </div>
        )}

        {/* Video iframe */}
        <iframe
          ref={iframeRef}
          src={streamUrl}
          className="w-full h-full"
          style={{ border: 'none' }}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; camera; microphone"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          loading="eager"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>

      {/* Reconnect info */}
      {autoReconnect && reconnectAttempts > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center font-mono">
          Auto-reconnect enabled • Attempt {reconnectAttempts}
        </div>
      )}
    </div>
  );
}
