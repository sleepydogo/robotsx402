'use client'

import React from 'react'
import { Camera, Grid3x3, Move } from 'lucide-react'
import { DynamicControl, Control } from './DynamicControl'

interface InterfaceConfig {
  controls: Control[]
  has_video: boolean
  has_gps: boolean
  api_version: string
  discovered_endpoints: string[]
}

interface InterfacePreviewProps {
  config: InterfaceConfig
  previewMode?: boolean
}

export const InterfacePreview: React.FC<InterfacePreviewProps> = ({ config, previewMode = true }) => {
  const controlsByType = {
    button: config.controls.filter(c => c.type === 'button'),
    slider: config.controls.filter(c => c.type === 'slider'),
    joystick: config.controls.filter(c => c.type === 'joystick'),
    toggle: config.controls.filter(c => c.type === 'toggle'),
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-neon-cyan/20 rounded-lg">
            <Grid3x3 className="w-5 h-5 text-neon-cyan" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-1">
              Interface Generated Successfully!
            </h4>
            <p className="text-white/70 text-sm mb-3">
              {config.controls.length} controls detected from API
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-white/60">{controlsByType.button.length} Buttons</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-white/60">{controlsByType.slider.length} Sliders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-white/60">{controlsByType.joystick.length} Joysticks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-white/60">{controlsByType.toggle.length} Toggles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Detected */}
      <div className="grid grid-cols-3 gap-2">
        {config.has_video && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
            <Camera className="w-4 h-4 mx-auto mb-1 text-purple-400" />
            <div className="text-xs text-white/70">Video Stream</div>
          </div>
        )}
        {config.has_gps && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
            <Grid3x3 className="w-4 h-4 mx-auto mb-1 text-green-400" />
            <div className="text-xs text-white/70">GPS Tracking</div>
          </div>
        )}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
          <Move className="w-4 h-4 mx-auto mb-1 text-blue-400" />
          <div className="text-xs text-white/70">API v{config.api_version}</div>
        </div>
      </div>

      {/* Controls Grid */}
      <div>
        <h5 className="text-white/70 text-sm font-medium mb-3">
          {previewMode ? 'Control Layout Preview' : 'Robot Controls'}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
          {config.controls.map((control) => (
            <DynamicControl
              key={control.id}
              control={control}
              previewMode={previewMode}
            />
          ))}
        </div>
      </div>

      {/* Discovered Endpoints */}
      {config.discovered_endpoints && config.discovered_endpoints.length > 0 && (
        <div>
          <h5 className="text-white/70 text-sm font-medium mb-2">Discovered Endpoints</h5>
          <div className="flex flex-wrap gap-1">
            {config.discovered_endpoints.map((endpoint, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/60"
              >
                {endpoint}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
