import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { API_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  enviarOtp: (telefono) => api.post('/auth/enviar-otp', { telefono }),
  verificarOtp: (telefono, codigo) =>
    api.post('/auth/verificar-otp', { telefono, codigo }),
  registrar: (telefono, tipo, nombre, idToken) =>
    api.post('/auth/verificar-otp', { telefono, token: idToken, tipo, nombre }),
};

export const servicesApi = {
  crear:   (data)      => api.post('/services/crear', data),
  ofertas: (serviceId) => api.get(`/services/${serviceId}/ofertas`),
  obtener: (serviceId) => api.get(`/services/${serviceId}`),
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
};

export default api;
