import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client'; // Importamos tu cliente configurado
import { useAuth } from '@/contexts/AuthContext';

// Interfaces basadas en tu API (puedes moverlas a types/robot.ts si prefieres)
export interface Robot {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  status: 'active' | 'inactive' | 'maintenance';
  image_url?: string;
  owner_id: string;
  services: string[];
  total_revenue?: number;
}

interface RobotCreateData {
  name: string;
  description: string;
  price: number;
  currency: string;
  wallet_address: string;
  endpoint: string;
  services: string[];
  image_url?: string;
}

export function useRobots() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Usamos isAuthenticated para saber si intentar hacer fetch o esperar
  const { isAuthenticated } = useAuth();

  const fetchRobots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ya no pasamos headers manuales, apiClient lo maneja
      const response = await apiClient.get<{ robots: Robot[], total: number }>('/robots');
      
      setRobots(response.data.robots);
    } catch (err: any) {
      console.error('Error fetching robots:', err);
      setError(err.response?.data?.detail || 'Failed to fetch robots');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRobot = async (data: RobotCreateData) => {
    try {
      const response = await apiClient.post<Robot>('/robots', data);
      
      // Actualizamos la lista localmente o recargamos
      await fetchRobots(); 
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to create robot';
      throw new Error(errorMessage);
    }
  };

  const updateRobot = async (id: string, data: Partial<Robot>) => {
    try {
      const response = await apiClient.patch<Robot>(`/robots/${id}`, data);
      
      // Actualizamos la lista para reflejar cambios
      await fetchRobots();
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update robot';
      throw new Error(errorMessage);
    }
  };

  const deleteRobot = async (id: string) => {
    try {
      await apiClient.delete(`/robots/${id}`);
      // Removemos el robot eliminado del estado local para evitar recargar todo si no es necesario
      setRobots(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete robot';
      throw new Error(errorMessage);
    }
  };

  // Cargar robots al montar el componente o cuando cambia el estado de autenticación
  useEffect(() => {
    // Solo intentamos cargar si el usuario está autenticado (o si la API /robots es pública, quita este if)
    if (isAuthenticated) {
      fetchRobots();
    } else {
      // Si no está autenticado, tal vez quieras limpiar los robots o cargar una lista pública
      setLoading(false);
    }
  }, [fetchRobots, isAuthenticated]);

  return {
    robots,
    loading,
    error,
    createRobot,
    updateRobot,
    deleteRobot,
    refresh: fetchRobots
  };
}