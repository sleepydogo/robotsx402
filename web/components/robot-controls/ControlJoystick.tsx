'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Gamepad2 } from 'lucide-react'

interface ControlJoystickProps {
  id: string
  label: string
  endpoint: string
  method: string
  axes: string[]
  range: Record<string, number[]>
  apiBaseUrl?: string
  onExecute?: (result: any) => void
  disabled?: boolean
  previewMode?: boolean
}

export const ControlJoystick: React.FC<ControlJoystickProps> = ({
  id,
  label,
  endpoint,
  method,
  axes,
  range,
  apiBaseUrl,
  onExecute,
  disabled = false,
  previewMode = false
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const joystickRef = useRef<HTMLDivElement>(null)

  const xAxis = axes[0] || 'x'
  const yAxis = axes[1] || 'y'
  const xRange = range[xAxis] || [-100, 100]
  const yRange = range[yAxis] || [-100, 100]

  const handleMouseDown = (e: React.MouseEvent) => {
    if (previewMode || disabled) return
    setIsDragging(true)
    updatePosition(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || previewMode || disabled) return
    updatePosition(e.clientX, e.clientY)
  }

  const handleMouseUp = async () => {
    if (!isDragging) return
    setIsDragging(false)

    if (!previewMode && apiBaseUrl) {
      await executeCommand()
    }

    // Reset to center
    setTimeout(() => setPosition({ x: 0, y: 0 }), 100)
  }

  const updatePosition = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = clientX - centerX
    const deltaY = clientY - centerY

    const maxDistance = rect.width / 2 - 20
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    let x = deltaX
    let y = deltaY

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX)
      x = Math.cos(angle) * maxDistance
      y = Math.sin(angle) * maxDistance
    }

    setPosition({ x, y })
  }

  const executeCommand = async () => {
    if (previewMode || !apiBaseUrl) return

    try {
      const joystickSize = joystickRef.current?.getBoundingClientRect().width || 150
      const maxDistance = joystickSize / 2 - 20

      // Map joystick position to API ranges
      const xValue = Math.round((position.x / maxDistance) * ((xRange[1] - xRange[0]) / 2))
      const yValue = Math.round((-position.y / maxDistance) * ((yRange[1] - yRange[0]) / 2))

      const url = `${apiBaseUrl}${endpoint}`
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [xAxis]: xValue,
          [yAxis]: yValue
        })
      })

      const result = await response.json()
      setLastResult(result)
      onExecute?.(result)
    } catch (error) {
      console.error('Error executing joystick:', error)
      setLastResult({ error: String(error) })
    }
  }

  useEffect(() => {
    if (isDragging && !previewMode) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, position, previewMode])

  return (
    <div className={`
      p-4 rounded-lg border backdrop-blur-sm
      ${previewMode
        ? 'bg-green-500/10 border-green-500/30'
        : 'bg-green-500/20 border-green-500/40'
      }
    `}>
      <div className="flex items-center gap-2 mb-3">
        <Gamepad2 className="w-4 h-4 text-green-400" />
        <span className="font-medium text-white">{label}</span>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Joystick Pad */}
        <div
          ref={joystickRef}
          onMouseDown={handleMouseDown}
          className={`
            relative w-40 h-40 rounded-full bg-black/20 border-2 border-green-500/50
            ${!previewMode && !disabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
          `}
        >
          {/* Center crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-px h-full bg-white/10"></div>
            <div className="absolute w-full h-px bg-white/10"></div>
          </div>

          {/* Joystick stick */}
          <div
            className="absolute w-12 h-12 rounded-full bg-green-500 border-2 border-green-300 shadow-lg pointer-events-none transition-transform"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
          </div>
        </div>

        {/* Position Display */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-black/20 rounded px-3 py-2 text-center">
            <div className="text-white/50">{xAxis}</div>
            <div className="text-white font-mono">
              {Math.round((position.x / 80) * ((xRange[1] - xRange[0]) / 2))}
            </div>
          </div>
          <div className="bg-black/20 rounded px-3 py-2 text-center">
            <div className="text-white/50">{yAxis}</div>
            <div className="text-white font-mono">
              {Math.round((-position.y / 80) * ((yRange[1] - yRange[0]) / 2))}
            </div>
          </div>
        </div>

        {!previewMode && lastResult && (
          <div className="w-full text-xs p-2 rounded bg-black/20 border border-white/10">
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
