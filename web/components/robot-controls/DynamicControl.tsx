'use client'

import React from 'react'
import { ControlButton } from './ControlButton'
import { ControlSlider } from './ControlSlider'
import { ControlJoystick } from './ControlJoystick'
import { ControlToggle } from './ControlToggle'

export interface Control {
  id: string
  type: 'button' | 'slider' | 'joystick' | 'toggle'
  label: string
  endpoint: string
  method: string
  params?: Record<string, any>
  param_name?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  axes?: string[]
  range?: Record<string, number[]>
  icon?: string
}

interface DynamicControlProps {
  control: Control
  apiBaseUrl?: string
  onExecute?: (controlId: string, result: any) => void
  disabled?: boolean
  previewMode?: boolean
}

export const DynamicControl: React.FC<DynamicControlProps> = ({
  control,
  apiBaseUrl,
  onExecute,
  disabled = false,
  previewMode = false
}) => {
  const handleExecute = (result: any) => {
    onExecute?.(control.id, result)
  }

  switch (control.type) {
    case 'button':
      return (
        <ControlButton
          id={control.id}
          label={control.label}
          endpoint={control.endpoint}
          method={control.method}
          params={control.params || {}}
          icon={control.icon}
          apiBaseUrl={apiBaseUrl}
          onExecute={handleExecute}
          disabled={disabled}
          previewMode={previewMode}
        />
      )

    case 'slider':
      if (!control.param_name || control.min === undefined || control.max === undefined || control.step === undefined) {
        console.error('Slider control missing required fields:', control)
        return null
      }
      return (
        <ControlSlider
          id={control.id}
          label={control.label}
          endpoint={control.endpoint}
          method={control.method}
          param_name={control.param_name}
          min={control.min}
          max={control.max}
          step={control.step}
          unit={control.unit}
          apiBaseUrl={apiBaseUrl}
          onExecute={handleExecute}
          disabled={disabled}
          previewMode={previewMode}
        />
      )

    case 'joystick':
      if (!control.axes || !control.range) {
        console.error('Joystick control missing required fields:', control)
        return null
      }
      return (
        <ControlJoystick
          id={control.id}
          label={control.label}
          endpoint={control.endpoint}
          method={control.method}
          axes={control.axes}
          range={control.range}
          apiBaseUrl={apiBaseUrl}
          onExecute={handleExecute}
          disabled={disabled}
          previewMode={previewMode}
        />
      )

    case 'toggle':
      if (!control.param_name) {
        console.error('Toggle control missing required fields:', control)
        return null
      }
      return (
        <ControlToggle
          id={control.id}
          label={control.label}
          endpoint={control.endpoint}
          method={control.method}
          param_name={control.param_name}
          apiBaseUrl={apiBaseUrl}
          onExecute={handleExecute}
          disabled={disabled}
          previewMode={previewMode}
        />
      )

    default:
      console.error('Unknown control type:', control.type)
      return null
  }
}
