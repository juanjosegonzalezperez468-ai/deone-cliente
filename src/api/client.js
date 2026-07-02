import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { API_URL } from '../constants/config';
import { getBackendToken, storeBackendToken, clearBackendToken, getPhone } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getBackendToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let _refreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !_refreshing) {
      original._retry = true;
      _refreshing = true;
      try {
        const user = auth().currentUser;
        const phone = await getPhone();
        if (user && phone) {
          const idToken = await user.getIdToken(true);
          const { data } = await axios.post(
            `${API_URL}/auth/verificar-otp`,
            { telefono: phone, token: idToken, tipo: 'cliente', nombre: 'usuario' },
            { headers: { 'Content-Type': 'application/json' } },
          );
          await storeBackendToken(data.token);
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        }
      } catch {
        await clearBackendToken();
      } finally {
        _refreshing = false;
      }
    }
    if (error.response?.status === 429) {
      error.friendlyMessage = 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
    }
    if (error.response?.status === 422) {
      const detail = error.response?.data?.detail;
      error.friendlyMessage =
        typeof detail === 'object' && detail?.mensaje
          ? detail.mensaje
          : 'Datos inválidos. Revisa la información e intenta de nuevo.';
    }
    _refreshing = false;
    return Promise.reject(error);
  },
);

export const authApi = {
  enviarOtp: (telefono) => api.post('/auth/enviar-otp', { telefono }),
  verificarOtp: (telefono, codigo) =>
    api.post('/auth/verificar-otp', { telefono, codigo }),
  registrar: (telefono, tipo, nombre, idToken) =>
    api.post('/auth/verificar-otp', { telefono, token: idToken, tipo, nombre }),
  perfil: (uid) => api.get(`/auth/perfil/${uid}`),
  registrarFcmToken: (uid, fcm_token) => api.patch(`/auth/perfil/${uid}/fcm-token`, { fcm_token }),
  aceptarTerminos: (uid) => api.patch(`/auth/perfil/${uid}/terminos`),
};

export const servicesApi = {
  crear:    (data)       => api.post('/services/crear', data),
  ofertas:  (serviceId)  => api.get(`/services/${serviceId}/ofertas`),
  obtener:  (serviceId)  => api.get(`/services/${serviceId}`),
  historial:(clienteId)  => api.get(`/services/cliente/${clienteId}`),
  cancelar: (serviceId)  => api.patch(`/services/${serviceId}/estado`, { estado: 'cancelado' }),
};

export const offersApi = {
  crear:        (data)         => api.post('/offers/crear', data),
  responder:    (id, accion)   => api.patch(`/offers/${id}/responder`, { accion }),
  porSolicitud: (requestId)    => api.get(`/offers/solicitud/${requestId}`),
};

export const ratingsApi = {
  enviar: (data) => api.post('/ratings', data),
};

export const locationsApi = {
  actualizarConductor: (data) =>
    api.post('/locations/conductor/actualizar', data),
  obtenerConductor: (conductorId) =>
    api.get(`/locations/conductor/${conductorId}`),
};

export const chatApi = {
  getMensajes:   (serviceId, uid) =>
    api.get(`/chat/${serviceId}/mensajes?reader_id=${uid}`),
  enviarMensaje: (serviceId, data) =>
    api.post(`/chat/${serviceId}/mensaje`, data),
};

export default api;
