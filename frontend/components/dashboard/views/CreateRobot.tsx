'use client';
import React, { useState } from 'react';
import { Cpu, Save, Loader2, AlertCircle, Upload, X } from 'lucide-react';
import { useRobots } from '@/lib/hooks/useRobots';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

export default function CreateRobot({ onCreated }: { onCreated?: () => void }) {
  const { createRobot } = useRobots();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0.01,
    currency: 'USDC',
    wallet_address: '', // Ej: 0x...
    endpoint: 'https://api.myrobot.com/v1',
    services: '', // String separado por comas para UI
    image_url: '' // URL de la imagen subida
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

      const imageUrl = response.data.image_url;

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
        price: Number(formData.price),
        services: formData.services.split(',').map(s => s.trim()).filter(s => s !== '')
      };

      await createRobot(payload);
      setSuccess(true);
      setFormData({ name: '', description: '', price: 0.01, currency: 'USDC', wallet_address: '', endpoint: '', services: '', image_url: '' });
      setImagePreview(null);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Robot Name</label>
            <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none" placeholder="e.g. Atlas MK-4" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Endpoint URL</label>
            <input required name="endpoint" value={formData.endpoint} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none" placeholder="https://..." />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-mono text-gray-400">Description</label>
          <textarea required name="description" value={formData.description} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none h-24" placeholder="Capabilities and specs..." />
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
              <option value="USDC">USDC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-mono text-gray-400">Services (comma separated)</label>
            <input required name="services" value={formData.services} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-neon-cyan focus:outline-none" placeholder="Bipedal, Surveillance" />
          </div>
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