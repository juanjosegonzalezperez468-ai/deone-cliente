import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { authApi } from '../api/client';
import { solicitarNotificacionesConAviso } from './notificationDisclosure';

export async function registrarNotificacionesPush(uuid) {
  if (!uuid) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('viajes', {
        name: 'Viajes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: true,
      });
    }

    const { status: finalStatus } = await solicitarNotificacionesConAviso();
    if (finalStatus !== 'granted') return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await authApi.registrarFcmToken(uuid, token);
  } catch {}
}
