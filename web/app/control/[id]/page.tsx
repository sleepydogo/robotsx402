'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Activity, Wifi, WifiOff, Video, MapPin, AlertTriangle } from 'lucide-react'
import { DynamicControl } from '@/components/robot-controls/DynamicControl'
import ChessControl from '@/components/robot-controls/ChessControl'
import Navbar from '@/components/dashboard/Navbar'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/contexts/AuthContext'

interface Robot {
  id: string
  name: string
  category: string
  description: string
  price: number
  currency: string
  wallet_address: string
  image_url?: string
  services: string[]
  endpoint: string
  status: string
  control_api_url?: string
  video_stream_url?: string
  has_gps: boolean
  gps_coordinates?: { lat: number; lng: number }
  interface_config?: {
    controls: any[]
    has_video: boolean
    has_gps: boolean
    api_version: string
    discovered_endpoints: string[]
  }
}

export default function RobotControlPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [robot, setRobot] = useState<Robot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [executionLog, setExecutionLog] = useState<Array<{ timestamp: string; controlId: string; result: any }>>([])

  useEffect(() => {
    // Don't redirect if still loading auth
    if (authLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    loadRobot()
  }, [params.id, isAuthenticated, authLoading])

  const loadRobot = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<Robot>(`/robots/${params.id}`)
      setRobot(response.data)

      // Check if robot API is accessible
      if (response.data.control_api_url) {
        checkConnection(response.data.control_api_url)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load robot')
    } finally {
      setLoading(false)
    }
  }

  const checkConnection = async (apiUrl: string) => {
    try {
      // Normalize URL to avoid double slashes
      const normalizedUrl = apiUrl.replace(/\/+$/, '') // Remove trailing slashes
      const response = await fetch(`${normalizedUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      setConnected(response.ok)
    } catch {
      setConnected(false)
    }
  }

  const handleControlExecute = (controlId: string, result: any) => {
    setExecutionLog(prev => [
      {
        timestamp: new Date().toISOString(),
        controlId,
        result
      },
      ...prev.slice(0, 9) // Keep last 10 executions
    ])
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-cyber-black text-white">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
        </div>
        <main className="flex-1 flex flex-col relative z-10">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white text-xl">Loading robot...</div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !robot) {
    return (
      <div className="flex h-screen bg-cyber-black text-white">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
        </div>
        <main className="flex-1 flex flex-col relative z-10">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <div className="text-white text-xl mb-4">{error || 'Robot not found'}</div>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 rounded-lg text-neon-cyan transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Skip interface_config validation for chess robots (they have custom interface)
  if (robot.category !== 'chess' && (!robot.interface_config || !robot.interface_config.controls || robot.interface_config.controls.length === 0)) {
    return (
      <div className="flex h-screen bg-cyber-black text-white">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
        </div>
        <main className="flex-1 flex flex-col relative z-10">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <div className="text-white text-xl mb-2">No Control Interface</div>
              <div className="text-white/60 mb-4">
                This robot doesn't have a control interface configured. Please edit the robot and use "Explore API with AI" to generate one.
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 rounded-lg text-neon-cyan transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-cyber-black text-white overflow-hidden selection:bg-neon-cyan selection:text-cyber-black">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
      </div>

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Navbar />
        {/* Content Area with padding */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Back Button & Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan mb-4 transition-colors font-mono text-sm"
            >
              <ArrowLeft size={18} />
              <span>BACK TO DASHBOARD</span>
            </button>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {robot.image_url && (
                    <img
                      src={robot.image_url}
                      alt={robot.name}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-neon-cyan/20"
                    />
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{robot.name}</h1>
                    <p className="text-gray-400 mb-3">{robot.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono ${
                        connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
                        <span>{connected ? 'ONLINE' : 'OFFLINE'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 font-mono">
                        <Activity size={16} />
                        <span className="uppercase">{robot.status}</span>
                      </div>
                      <div className="text-neon-cyan font-mono font-semibold">
                        {robot.price} {robot.currency}/session
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chess Robot - Full Custom Interface */}
          {robot.category === 'chess' ? (
            <ChessControl
              robot={{
                id: robot.id,
                name: robot.name,
                control_api_url: robot.control_api_url || robot.endpoint,
                video_stream_url: robot.video_stream_url
              }}
            />
          ) : (
            /* Standard Dynamic Controls */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Control Panel */}
              <div className="lg:col-span-2">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h2 className="text-white text-xl font-semibold mb-4 font-mono">ROBOT CONTROLS</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {robot.interface_config && robot.interface_config.controls.map((control) => (
                      <DynamicControl
                        key={control.id}
                        control={control}
                        apiBaseUrl={robot.control_api_url}
                        onExecute={handleControlExecute}
                        previewMode={false}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Video Stream */}
                {robot.video_stream_url && (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-neon-cyan" />
                      <h3 className="text-white font-semibold font-mono">VIDEO FEED</h3>
                    </div>
                    <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                      <img
                        src={robot.video_stream_url}
                        alt="Robot video stream"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* GPS Location */}
                {robot.has_gps && robot.gps_coordinates && (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-white font-semibold font-mono">GPS LOCATION</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Latitude:</span>
                        <span className="text-white font-mono">{robot.gps_coordinates.lat}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Longitude:</span>
                        <span className="text-white font-mono">{robot.gps_coordinates.lng}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Execution Log */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 font-mono">EXECUTION LOG</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {executionLog.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-4 font-mono">
                        No commands executed yet
                      </div>
                    ) : (
                      executionLog.map((log, idx) => (
                        <div key={idx} className="text-xs p-2 bg-black/30 rounded border border-white/5">
                          <div className="text-gray-500 mb-1 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-gray-300">
                            <span className="text-neon-cyan font-mono">{log.controlId}</span>
                            {log.result.error ? (
                              <span className="text-red-400 ml-2">❌ Error</span>
                            ) : (
                              <span className="text-emerald-400 ml-2">✓ Success</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
