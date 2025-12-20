
export interface Robot {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  wallet_address: string;
  services: string[];
  endpoint: string;
  status: 'active' | 'inactive' | 'maintenance';
  execution_count: number;
  total_revenue: number;
  avg_response_time: number;
  success_rate: number;
  created_at: string;
  image_url: string;
}

