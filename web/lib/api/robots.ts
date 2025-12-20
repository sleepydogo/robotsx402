import { apiClient } from './client';

export interface RobotAvailability {
  robot_id: string;
  available: boolean;
  status: 'available' | 'busy';
  locked_by_user_id?: string;
  time_remaining_seconds?: number;
  time_remaining_minutes?: number;
}

/**
 * Check if a robot is available for use
 * This endpoint doesn't require authentication
 */
export const checkRobotAvailability = async (robotId: string): Promise<RobotAvailability> => {
  const response = await apiClient.get<RobotAvailability>(`/robots/${robotId}/availability`);
  return response.data;
};

/**
 * Check availability for multiple robots
 */
export const checkMultipleRobotAvailability = async (robotIds: string[]): Promise<Record<string, RobotAvailability>> => {
  const promises = robotIds.map(id => checkRobotAvailability(id));
  const results = await Promise.all(promises);

  const availabilityMap: Record<string, RobotAvailability> = {};
  results.forEach((result, index) => {
    availabilityMap[robotIds[index]] = result;
  });

  return availabilityMap;
};
