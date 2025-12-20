'use client';
import React, { useState } from 'react';
import { Cpu, Save, Loader2, AlertCircle, Upload, X, Zap, Video, MapPin, Sparkles, Plus, Trash2, Clock } from 'lucide-react';
import { useRobots } from '@/lib/hooks/useRobots';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { InterfacePreview } from '@/components/robot-controls/InterfacePreview';

export default function CreateRobot({ onCreated }: { onCreated?: () => void }) {
  const { createRobot } = useRobots();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [exploringAPI, setExploringAPI] = useState(false);
  const [error, setError] = useState('');
  const [apiExplorationError, setApiExplorationError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedInterface, setGeneratedInterface] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    description: '',
    price: 0.01,
    currency: 'rUSD',
    wallet_address: '',
    services: '',
    image_url: '',
    // Campos para control avanzado
    control_api_url: '',
    control_api_key: '',
    video_stream_url: '',
    has_gps: false,
    gps_coordinates: { lat: 0, lng: 0 },
    rental_plans: [
      { duration_minutes: 30, price: 5.0, name: '30 minutes' }
    ] as Array<{ duration_minutes: number; price: number; name?: string }>
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to backend
      const response = await apiClient.post<{ image_url: string }>('/robots/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Use the API URL to construct the full image URL
      // NEXT_PUBLIC_API_URL is like https://api.robotsx402.fun/api
      // We need to replace /api with the upload path to get: https://api.robotsx402.fun/uploads/robots/...
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const imageUrl = apiBaseUrl.replace('/api', response.data.image_url);

      // Update form data with image URL
      setFormData(prev => ({ ...prev, image_url: imageUrl }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload image');
      console.error('Image upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const addRentalPlan = () => {
    setFormData(prev => ({
      ...prev,
      rental_plans: [...prev.rental_plans, { duration_minutes: 60, price: 10.0, name: '1 hour' }]
    }));
  };

  const removeRentalPlan = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rental_plans: prev.rental_plans.filter((_, i) => i !== index)
    }));
  };

  const updateRentalPlan = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      rental_plans: prev.rental_plans.map((plan, i) =>
        i === index ? { ...plan, [field]: value } : plan
      )
    }));
  };

  const exploreAPIWithAI = async () => {
    if (!formData.control_api_url) {
      setApiExplorationError('Please provide a Control API URL first');
      return;
    }

    setExploringAPI(true);
    setApiExplorationError('');
    setGeneratedInterface(null);

    try {
      // Call backend endpoint to explore API and generate interface
      const response = await apiClient.post<{ interface_config: any }>('/robots/explore-api', {
        api_url: formData.control_api_url,
        robot_name: formData.name || 'Unknown Robot',
        has_video: !!formData.video_stream_url,
        has_gps: formData.has_gps
      });

      const interfaceConfig = response.data.interface_config;
      setGeneratedInterface(interfaceConfig);
      setApiExplorationError('');

      console.log('Generated interface:', interfaceConfig);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to explore API. Make sure the URL is accessible and returns valid documentation.';
      setApiExplorationError(errorMsg);
      setGeneratedInterface(null);
      console.error('API exploration error:', err);
    } finally {
      setExploringAPI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify authentication
    if (!isAuthenticated) {
      setError('You must be logged in to create a robot. Please connect your wallet.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Formatear datos para el backend
      const payload = {
        ...formData,
        endpoint: formData.control_api_url, // Usar control_api_url como endpoint
        price: Number(formData.price),
        services: formData.services.split(',').map(s => s.trim()).filter(s => s !== ''),
        interface_config: generatedInterface || null
      };

      await createRobot(payload);
      setSuccess(true);
      setFormData({
        name: '',
        category: 'general',
        description: '',
        price: 0.01,
        currency: 'rUSD',
        wallet_address: '',
        services: '',
        image_url: '',
        control_api_url: '',
        control_api_key: '',
        video_stream_url: '',
        has_gps: false,
        gps_coordinates: { lat: 0, lng: 0 },
        rental_plans: [
          { duration_minutes: 30, price: 5.0, name: '30 minutes' }
        ] as Array<{ duration_minutes: number; price: number; name?: string }>
      });
      setImagePreview(null);
      setGeneratedInterface(null);
      if (onCreated) onCreated();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create robot';
      setError(errorMsg);
      console.error('Create robot error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in">
        <div className="p-6 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Cpu size={48} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Robot Deployed Successfully</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
        <div className="p-3 bg-neon-cyan/10 rounded-lg">
           <Cpu className="text-neon-cyan" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Register New Unit</h2>
          <p className="text-gray-400 text-sm">Deploy a new robot node to the x402 network.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isAuthenticated && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded flex items-center gap-2">
            <AlertCircle size={18} /> Please connect your wallet to create robots.
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-mono text-gray-400">Robot Name</label>
          <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none" placeholder="e.g. Atlas MK-4" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-mono text-gray-400">Category</label>
          <select
            required
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none"
          >
            <option value="general">General Purpose</option>
            <option value="chess">Chess Robot</option>
            <option value="drone">Drone</option>
            <option value="arm">Robotic Arm</option>
            <option value="vehicle">Vehicle/Rover</option>
            <option value="humanoid">Humanoid</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-mono text-gray-400">Description</label>
          <textarea required name="description" value={formData.description} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none h-24" placeholder="Capabilities and specs..." />
        </div>

        {/* Advanced Control Section */}
        <div className="border border-neon-cyan/20 rounded-lg p-6 bg-neon-cyan/5 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-neon-cyan" size={20} />
            <h3 className="text-lg font-bold text-white">AI-Powered Control Interface</h3>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400 flex items-center gap-2">
              <Cpu size={16} />
              Control API URL *
            </label>
            <input
              required
              name="control_api_url"
              value={formData.control_api_url}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none font-mono text-sm"
              placeholder="https://robot-api.example.com/control"
            />
            <p className="text-xs text-gray-500">Main API endpoint for robot control commands</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Control API Key (Optional)</label>
            <input
              type="password"
              name="control_api_key"
              value={formData.control_api_key}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none font-mono text-sm"
              placeholder="••••••••••••••••"
            />
            <p className="text-xs text-gray-500">API key for authenticating with the robot's control API (stored securely, never exposed to users)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-mono text-gray-400 flex items-center gap-2">
                <Video size={16} />
                Video Stream URL (Optional)
              </label>
              <input
                name="video_stream_url"
                value={formData.video_stream_url}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none font-mono text-sm"
                placeholder="https://stream.example.com/live"
              />
              <p className="text-xs text-gray-500">HLS, RTSP, or WebRTC stream URL</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-gray-400 flex items-center gap-2">
                <MapPin size={16} />
                GPS Tracking
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_gps}
                    onChange={(e) => setFormData({ ...formData, has_gps: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 checked:bg-neon-cyan"
                  />
                  <span className="text-sm text-gray-300">Robot has GPS</span>
                </label>
              </div>
              {formData.has_gps && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={formData.gps_coordinates.lat || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      gps_coordinates: { ...formData.gps_coordinates, lat: parseFloat(e.target.value) || 0 }
                    })}
                    className="bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-neon-cyan focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={formData.gps_coordinates.lng || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      gps_coordinates: { ...formData.gps_coordinates, lng: parseFloat(e.target.value) || 0 }
                    })}
                    className="bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-neon-cyan focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Chess Robot Info - No AI Exploration Needed */}
          {formData.category === 'chess' && (
            <div className="bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan p-4 rounded flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">Chess Robot Interface</p>
                <p className="text-xs text-neon-cyan/80">
                  Chess robots use a specialized control interface. No AI exploration needed - just fill in the API URL and create!
                </p>
              </div>
            </div>
          )}

          {/* AI Explore Button - Hidden for chess robots */}
          {formData.category !== 'chess' && (
            <>
              <button
                type="button"
                onClick={exploreAPIWithAI}
                disabled={exploringAPI || !formData.control_api_url}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exploringAPI ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Exploring API & Generating Interface...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Explore API with AI
                  </>
                )}
              </button>

              {/* API Exploration Error */}
              {apiExplorationError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded flex items-start gap-3 animate-in fade-in">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">Failed to explore API</p>
                    <p className="text-xs text-red-300/80">{apiExplorationError}</p>
                  </div>
                </div>
              )}

              {/* Generated Interface Preview */}
              {generatedInterface && (
                <div className="mt-4 animate-in fade-in">
                  <div className="mb-3 flex items-center gap-2 text-emerald-400">
                    <Sparkles size={16} />
                    <span className="text-sm font-semibold">Interface Generated Successfully</span>
                  </div>
                  <InterfacePreview config={generatedInterface} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-mono text-gray-400">Robot Image (Optional)</label>

          {!imagePreview ? (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
                id="robot-image"
              />
              <label
                htmlFor="robot-image"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded cursor-pointer hover:border-neon-cyan/50 transition-colors bg-white/5"
              >
                {uploadingImage ? (
                  <Loader2 className="animate-spin text-neon-cyan" size={32} />
                ) : (
                  <>
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <span className="text-sm text-gray-400">Click to upload image</span>
                    <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="relative w-full h-40 rounded overflow-hidden border border-white/10">
              <img src={imagePreview} alt="Robot preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Price per Second</label>
            <input required type="number" step="0.0001" name="price" value={formData.price} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Currency</label>
            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none">
              <option value="rUSD">rUSD (Robot USD)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Services (comma separated)</label>
            <input required name="services" value={formData.services} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none" placeholder="Bipedal, Surveillance" />
          </div>
        </div>

        {/* Rental Plans Section */}
        <div className="border border-purple-500/20 rounded-lg p-6 bg-purple-500/5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="text-purple-400" size={20} />
              <div>
                <h3 className="text-lg font-bold text-white">Rental Plans</h3>
                <p className="text-sm text-gray-400">Define pricing packages for robot usage</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addRentalPlan}
              className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded text-purple-300 font-mono text-sm flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              Add Plan
            </button>
          </div>

          {formData.rental_plans.map((plan, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-mono text-sm">Plan {index + 1}</span>
                {formData.rental_plans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRentalPlan(index)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-400">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={plan.duration_minutes}
                    onChange={(e) => updateRentalPlan(index, 'duration_minutes', parseInt(e.target.value) || 1)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-400">Price (rUSD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={plan.price}
                    onChange={(e) => updateRentalPlan(index, 'price', parseFloat(e.target.value) || 0.01)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="5.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-400">Plan Name (optional)</label>
                  <input
                    type="text"
                    value={plan.name || ''}
                    onChange={(e) => updateRentalPlan(index, 'name', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., 30 minutes"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 font-mono">
                Rate: {(plan.price / plan.duration_minutes).toFixed(4)} rUSD/min
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-mono text-gray-400">Wallet Address (Earnings)</label>
          <input required name="wallet_address" value={formData.wallet_address} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none font-mono" placeholder="0x..." />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || !isAuthenticated}
            className="w-full bg-neon-cyan text-cyber-black font-bold font-mono py-4 rounded hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {!isAuthenticated ? 'CONNECT WALLET TO CREATE' : 'INITIALIZE ROBOT'}
          </button>
        </div>
      </form>
    </div>
  );
}