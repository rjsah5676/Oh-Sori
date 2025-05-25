import redis from '../utils/redis';

const getUserStatusKey = (userId: string) => `user_status:${userId}`;

export async function setUserStatus(userId: string, status: 'online' | 'offline' | 'away' | 'dnd') {
  await redis.set(getUserStatusKey(userId), status);
}

export async function getUserStatus(userId: string): Promise<'online' | 'offline' | 'away' | 'dnd'> {
  const status = await redis.get(getUserStatusKey(userId));
  return (status as any) || 'offline'; // 기본값은 'offline'
}
