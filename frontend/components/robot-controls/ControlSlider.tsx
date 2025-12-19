'use client'

import React, { useState } from 'react'
import { Sliders } from 'lucide-react'

interface ControlSliderProps {
  id: string
  label: string
  endpoint: string
  method: string
  param_name: string
  min: number
  max: number
  step: number
  unit?: string
  apiBaseUrl?: string
  onExecute?: (result: any) => void
  disabled?: boolean
  previewMode?: boolean
}

export const ControlSlider: React.FC<ControlSliderProps> = ({
  id,
  label,
  endpoint,
  method,
  param_name,
  min,
  max,
  step,
  unit = '',
  apiBaseUrl,
  onExecute,
  disabled = false,
  previewMode = false
}) => {
  const [value, setValue] = useState<number>(min + (max - min) / 2)
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value))
  }

  const handleExecute = async () => {
    if (previewMode || !apiBaseUrl) {
      console.log('Preview mode - would execute:', { endpoint, method, [param_name]: value })
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
        body: JSON.stringify({ [param_name]: value })
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
    <div className={`
      p-4 rounded-lg border backdrop-blur-sm
      ${previewMode
        ? 'bg-purple-500/10 border-purple-500/30'
        : 'bg-purple-500/20 border-purple-500/40'
      }
    `}>
      <div className="flex items-center gap-2 mb-3">
        <Sliders className="w-4 h-4 text-purple-400" />
        <span className="font-medium text-white">{label}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={disabled || loading || previewMode}
            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-purple-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-purple-500
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="w-20 text-right">
            <span className="text-white font-mono text-lg">{value}</span>
            <span className="text-white/50 text-sm ml-1">{unit}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/50">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>

        {!previewMode && (
          <button
            onClick={handleExecute}
            disabled={disabled || loading}
            className="w-full py-2 px-4 rounded bg-purple-500/30 hover:bg-purple-500/50
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all text-sm font-medium"
          >
            {loading ? 'Applying...' : 'Apply'}
          </button>
        )}

        {!previewMode && lastResult && (
          <div className="text-xs p-2 rounded bg-black/20 border border-white/10">
            {lastResult.error ? (
              <span className="text-red-400">❌ {lastResult.error}</span>
            ) : (
              <span className="text-green-400">✓ {lastResult.message || 'Success'}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
