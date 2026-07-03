import { io } from 'socket.io-client';
import { API_URL } from '../constants/config';
import { getBackendToken } from './tokenStorage';

export async function connectTripSocket(requestId, onLocation) {
  if (!requestId) return null;
  const token = await getBackendToken();
  if (!token) return null;

  const socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  const join = () => socket.emit('join_request', { request_id: requestId });

  socket.on('connect', join);
  socket.on('conductor_location', (data) => {
    if (data?.lat && data?.lng) onLocation(data);
  });

  return socket;
}
