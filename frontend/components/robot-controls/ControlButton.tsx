'use client'

import React, { useState } from 'react'
import * as LucideIcons from 'lucide-react'

interface ControlButtonProps {
  id: string
  label: string
  endpoint: string
  method: string
  params: Record<string, any>
  icon?: string
  apiBaseUrl?: string
  onExecute?: (result: any) => void
  disabled?: boolean
  previewMode?: boolean
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  id,
  label,
  endpoint,
  method,
  params,
  icon,
  apiBaseUrl,
  onExecute,
  disabled = false,
  previewMode = false
}) => {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  // Get Lucide icon component
  const Icon = icon && (LucideIcons as any)[icon] ? (LucideIcons as any)[icon] : LucideIcons.Move

  const handleClick = async () => {
    if (previewMode || !apiBaseUrl) {
      console.log('Preview mode - would execute:', { endpoint, method, params })
      return
    }

    setLoading(true)
    try {
      const url = `${apiBaseUrl}${endpoint}`
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify(params) : undefined
      })

      const result = await response.json()
      setLastResult(result)
      onExecute?.(result)
    } catch (error) {
      console.error('Error executing control:', error)
      setLastResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          w-full p-4 rounded-lg border transition-all
          ${previewMode
            ? 'bg-blue-500/10 border-blue-500/30 cursor-default'
            : 'bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30 hover:border-blue-500/60'
          }
          ${loading ? 'opacity-50 cursor-wait' : ''}
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          backdrop-blur-sm
        `}
      >
        <div className="flex items-center justify-center gap-2">
          <Icon className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
          <span className="font-medium">{label}</span>
        </div>
      </button>

      {!previewMode && lastResult && (
        <div className="text-xs p-2 rounded bg-black/20 border border-white/10">
          <div className="text-white/50">Last result:</div>
          <div className="text-white/70 font-mono mt-1">
            {lastResult.error ? (
              <span className="text-red-400">❌ {lastResult.error}</span>
            ) : (
              <span className="text-green-400">✓ {lastResult.message || 'Success'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
