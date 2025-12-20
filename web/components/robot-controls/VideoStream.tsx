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
  reconnectInterval = 3000,
  height
}: VideoStreamProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobileRef = useRef(false);

  // Detect if mobile device
  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log(`Device detected: ${isMobileRef.current ? 'Mobile' : 'Desktop'}`);
  }, []);

  // Start stream when component mounts or streamUrl changes
  useEffect(() => {
    if (streamUrl) {
      const timer = setTimeout(() => {
        startStream();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [streamUrl]);

  // Handle page visibility changes (battery optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden, pausing stream');
        stopStream();
      } else {
        console.log('Page visible, resuming stream');
        setTimeout(() => startStream(), 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopStream();
    };
  }, [streamUrl]);

  // Main stream start function
  const startStream = () => {
    if (!streamUrl || !imgRef.current) return;

    setIsLoading(true);
    setHasError(false);

    if (isMobileRef.current) {
      console.log('Starting snapshot polling (mobile)');
      startSnapshotPolling();
    } else {
      console.log('Starting MJPEG stream (desktop)');
      startMJPEGStream();
    }
  };

  // Stop stream
  const stopStream = () => {
    // Abort MJPEG stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }

    // Clear snapshot polling
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }

    setIsConnected(false);
  };

  // MJPEG Stream method (for desktop)
  const startMJPEGStream = async () => {
    if (!imgRef.current) return;

    // Cancel previous stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }

    streamControllerRef.current = new AbortController();
    let buffer = new Uint8Array();
    let firstFrameReceived = false;
    let localFrameCount = 0;

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        signal: streamControllerRef.current.signal,
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if ReadableStream is supported
      if (!response.body || !response.body.getReader) {
        console.log('ReadableStream not supported, falling back to snapshot polling');
        startSnapshotPolling();
        return;
      }

      const reader = response.body.getReader();

      // Read stream chunks
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Stream ended');
          break;
        }

        // Skip empty chunks
        if (!value || value.length === 0) {
          continue;
        }

        // Append new data to buffer
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Look for complete JPEG frames
        // JPEG starts with 0xFF 0xD8 and ends with 0xFF 0xD9
        let startIdx = -1;
        let endIdx = -1;

        for (let i = 0; i < buffer.length - 1; i++) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && startIdx === -1) {
            startIdx = i;
          }
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9 && startIdx !== -1) {
            endIdx = i + 2;
            break;
          }
        }

        // If we found a complete JPEG frame
        if (startIdx !== -1 && endIdx !== -1 && imgRef.current) {
          const jpegData = buffer.slice(startIdx, endIdx);

          try {
            const blob = new Blob([jpegData], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);

            // Update image
            const oldUrl = imgRef.current.src;
            imgRef.current.src = url;

            // Show success message only for the first frame
            if (!firstFrameReceived) {
              firstFrameReceived = true;
              setIsConnected(true);
              setIsLoading(false);
              setHasError(false);
              console.log('First frame received successfully');
            }

            // Clean up old blob URL to prevent memory leaks
            if (oldUrl && oldUrl.startsWith('blob:')) {
              setTimeout(() => {
                try {
                  URL.revokeObjectURL(oldUrl);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }, 200);
            }

            localFrameCount++;
            setFrameCount(localFrameCount);

            // Log progress every 60 frames
            if (localFrameCount % 60 === 0) {
              console.log(`Stream healthy: ${localFrameCount} frames received`);
            }

          } catch (blobError) {
            console.error('Error creating blob:', blobError);
          }

          // Remove processed data from buffer
          buffer = buffer.slice(endIdx);
        }

        // Prevent buffer from growing too large (memory protection)
        if (buffer.length > 3 * 1024 * 1024) { // 3MB limit
          console.warn('Buffer overflow, resetting');
          buffer = new Uint8Array();
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Stream error:', error);
        setHasError(true);
        setIsLoading(false);

        // Auto-retry connection if it was previously connected
        if (autoReconnect && isConnected) {
          setTimeout(() => {
            console.log('Attempting to reconnect...');
            startStream();
          }, reconnectInterval);
        }
      }
    }
  };

  // Snapshot polling method (for mobile devices or fallback)
  const startSnapshotPolling = () => {
    if (!imgRef.current) return;

    // Clear any existing interval
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
    }

    let localFrameCount = 0;
    let errorCount = 0;
    const maxErrors = 5;

    // Function to fetch a single snapshot
    const fetchSnapshot = async () => {
      if (!imgRef.current) return;

      try {
        const response = await fetch(streamUrl, {
          method: 'GET',
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Update image
        const oldUrl = imgRef.current.src;
        imgRef.current.src = url;

        // Clean up old blob URL
        if (oldUrl && oldUrl.startsWith('blob:')) {
          setTimeout(() => {
            try {
              URL.revokeObjectURL(oldUrl);
            } catch (e) {
              // Ignore
            }
          }, 100);
        }

        // Success feedback
        if (localFrameCount === 0) {
          setIsConnected(true);
          setIsLoading(false);
          setHasError(false);
          console.log('Snapshot polling started successfully');
        }

        localFrameCount++;
        setFrameCount(localFrameCount);
        errorCount = 0; // Reset error count on success

        if (localFrameCount % 30 === 0) {
          console.log(`Snapshot polling healthy: ${localFrameCount} frames`);
        }

      } catch (error: any) {
        errorCount++;
        console.error(`Snapshot error (${errorCount}/${maxErrors}):`, error);

        if (errorCount >= maxErrors) {
          if (snapshotIntervalRef.current) {
            clearInterval(snapshotIntervalRef.current);
            snapshotIntervalRef.current = null;
          }
          setIsConnected(false);
          setIsLoading(false);
          setHasError(true);

          // Auto-retry if enabled
          if (autoReconnect) {
            setTimeout(() => {
              console.log('Attempting to reconnect...');
              startStream();
            }, reconnectInterval);
          }
        }
      }
    };

    // Start polling at 10 FPS (100ms interval)
    fetchSnapshot(); // Fetch first frame immediately
    snapshotIntervalRef.current = setInterval(fetchSnapshot, 100);
  };

  // Manual reconnect
  const handleManualReconnect = () => {
    stopStream();
    setTimeout(() => startStream(), 100);
  };

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
                <span className="text-xs text-red-400 font-mono">
                  LIVE {isMobileRef.current ? '(MOBILE)' : ''}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="bg-black rounded-lg overflow-hidden border border-white/10 relative flex items-center justify-center"
        style={height ? { height } : { aspectRatio: '16/9' }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-mono">
                Connecting to stream...
              </p>
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
                {autoReconnect ? 'Reconnecting...' : 'Unable to load video stream'}
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

        {/* Video image */}
        <img
          ref={imgRef}
          alt={title}
          className="w-full h-full object-contain"
          style={{ display: isLoading || hasError ? 'none' : 'block' }}
        />
      </div>

      {/* Frame count info */}
      {isConnected && frameCount > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center font-mono">
          {frameCount} frames • {isMobileRef.current ? 'Snapshot mode (10 FPS)' : 'MJPEG stream'}
        </div>
      )}
    </div>
  );
}
