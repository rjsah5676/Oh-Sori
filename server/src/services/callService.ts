import redis from '../utils/redis';

const getCallRoomKey = (roomId: string) => `call_room:${roomId}`;

export async function startCallSession(roomId: string, caller: string, callee: string, callerEnded: boolean, calleeEnded: boolean) {
  await redis.hmset(getCallRoomKey(roomId), {
    caller,
    callee,
    startedAt: Date.now().toString(),
    callerEnded,
    calleeEnded,
  });
}


export async function getCallSession(roomId: string) {
  const key = getCallRoomKey(roomId);
  const data = await redis.hgetall(key);
  return data && Object.keys(data).length > 0 ? data : null;
}

export async function acceptCall(roomId: string) {
  const data = await getCallSession(roomId);
  if (!data) return;

  await redis.hset(getCallRoomKey(roomId), 'calleeEnded', 'false');
}

export async function reconnCall(roomId: string, isCaller: boolean) {
  const data = await getCallSession(roomId);
  if (!data) return;
  if(isCaller) await redis.hset(getCallRoomKey(roomId), 'callerEnded', 'false');
  else await redis.hset(getCallRoomKey(roomId), 'calleeEnded', 'false');
  const updated = await getCallSession(roomId);
  return updated;
}

export async function endCallForUser(roomId: string, userEmail: string) {
  const data = await getCallSession(roomId);
  if (!data) return;

  const key = data.caller === userEmail ? 'callerEnded' : data.callee === userEmail ? 'calleeEnded' : null;
  if (!key) return;

  await redis.hset(getCallRoomKey(roomId), key, 'true');

  const updated = await redis.hgetall(getCallRoomKey(roomId));
  if (updated.callerEnded === 'true' && updated.calleeEnded === 'true') {
    await redis.del(getCallRoomKey(roomId));
  }
}

/**
 * Redis에 저장된 값 기반으로 특정 유저가 caller인지 확인
 */
export function isUserCaller(session: any, email: string): boolean {
  if (!session || !email) return false;
  if (session.caller === email) return session.callerIsCaller === 'true';
  if (session.callee === email) return session.calleeIsCaller === 'true';
  return false;
}
