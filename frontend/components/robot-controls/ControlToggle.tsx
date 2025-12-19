'use client'

import React, { useState } from 'react'
import { Power } from 'lucide-react'

interface ControlToggleProps {
  id: string
  label: string
  endpoint: string
  method: string
  param_name: string
  apiBaseUrl?: string
  onExecute?: (result: any) => void
  disabled?: boolean
  previewMode?: boolean
}

export const ControlToggle: React.FC<ControlToggleProps> = ({
  id,
  label,
  endpoint,
  method,
  param_name,
  apiBaseUrl,
  onExecute,
  disabled = false,
  previewMode = false
}) => {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const handleToggle = async () => {
    const newValue = !enabled

    if (previewMode || !apiBaseUrl) {
      setEnabled(newValue)
      console.log('Preview mode - would execute:', { endpoint, method, [param_name]: newValue })
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
        body: JSON.stringify({ [param_name]: newValue })
      })

      const result = await response.json()
      setEnabled(newValue)
      setLastResult(result)
      onExecute?.(result)
    } catch (error) {
      console.error('Error executing toggle:', error)
      setLastResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`
      p-4 rounded-lg border backdrop-blur-sm
      ${previewMode
        ? 'bg-yellow-500/10 border-yellow-500/30'
        : 'bg-yellow-500/20 border-yellow-500/40'
      }
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Power className={`w-4 h-4 ${enabled ? 'text-yellow-400' : 'text-white/50'}`} />
          <span className="font-medium text-white">{label}</span>
        </div>

        <button
          onClick={handleToggle}
          disabled={disabled || loading || previewMode}
          className={`
            relative w-14 h-8 rounded-full transition-all
            ${enabled ? 'bg-yellow-500' : 'bg-white/20'}
            ${previewMode ? 'cursor-default' : 'cursor-pointer'}
            ${disabled || loading ? 'opacity-40 cursor-not-allowed' : ''}
          `}
        >
          <div className={`
            absolute top-1 left-1 w-6 h-6 rounded-full bg-white
            transition-transform duration-200
            ${enabled ? 'translate-x-6' : 'translate-x-0'}
          `}></div>
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        <div className={`
          px-2 py-1 rounded
          ${enabled ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/10 text-white/50'}
        `}>
          {enabled ? 'ON' : 'OFF'}
        </div>
        {loading && <span className="text-white/50">Updating...</span>}
      </div>

      {!previewMode && lastResult && (
        <div className="mt-2 text-xs p-2 rounded bg-black/20 border border-white/10">
          {lastResult.error ? (
            <span className="text-red-400">❌ {lastResult.error}</span>
          ) : (
            <span className="text-green-400">✓ {lastResult.message || 'Success'}</span>
          )}
        </div>
      )}
    </div>
  )
}
