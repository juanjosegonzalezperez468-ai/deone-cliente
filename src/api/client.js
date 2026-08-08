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
            { telefono: phone, token: idToken, tipo: 'cliente' },
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
  verificarOtp: (telefono, codigo) =>
    api.post('/auth/verificar-otp', { telefono, codigo }),
  registrar: (telefono, tipo, nombre, idToken) =>
    api.post('/auth/verificar-otp', {
      telefono,
      token: idToken,
      tipo,
      ...(nombre ? { nombre } : {}),
    }),
  perfil: (uid) => api.get(`/auth/perfil/${uid}`),
  eliminarCuenta: (uid) => api.delete(`/auth/cuenta/${uid}`),
  subirFotoPerfil: (uid, formData) =>
    api.post(`/auth/perfil/${uid}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),
  registrarFcmToken: (uid, fcm_token) => api.patch(`/auth/perfil/${uid}/fcm-token`, { fcm_token }),
  aceptarTerminos: (uid) => api.patch(`/auth/perfil/${uid}/terminos`),
};

export const soporteApi = {
  miConversacion: ()    => api.get('/soporte/mi-conversacion'),
  enviar:         (msg) => api.post('/soporte/mensaje', { mensaje: msg }),
};

export const servicesApi = {
  crear:    (data)       => api.post('/services/crear', data),
  // Reglas de tarifa y margen de negociación que exige el servidor. La app
  // tiene sus propios valores por defecto: esto solo sirve para que un cambio
  // de política no obligue a publicar una versión nueva.
  configTarifas: ()      => api.get('/services/config-tarifas'),
  ofertas:  (serviceId)  => api.get(`/services/${serviceId}/ofertas`),
  obtener:  (serviceId)  => api.get(`/services/${serviceId}`),
  historial:(clienteId)  => api.get(`/services/cliente/${clienteId}`),
  cancelar: (serviceId)  => api.patch(`/services/${serviceId}/estado`, { estado: 'cancelado' }),
  // Sube la foto de la tarjeta de propiedad del vehículo a remolcar (grúa).
  // Devuelve { path } que se envía como tarjeta_propiedad_path al crear.
  subirManifiesto: (formData) =>
    api.post('/services/manifiesto/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

// Rutas urbanas de reparto: el comercio contrata un conductor por horas
// para entregar múltiples pedidos en un solo recorrido.
export const rutasApi = {
  cotizar:  (data)          => api.post('/rutas/cotizar', data),
  crear:    (data)          => api.post('/rutas', data),
  obtener:  (rutaId)        => api.get(`/rutas/${rutaId}`),
  misRutas: (rol)           => api.get('/rutas/mis-rutas', { params: { rol } }),
  cancelar: (rutaId, motivo) => api.post(`/rutas/${rutaId}/cancelar`, { motivo }),
};

// Saldo prepago del cliente: se usa como garantía para publicar rutas
// (las multas de cancelación se descuentan de aquí).
export const billingApi = {
  saldo:            (userId) => api.get(`/billing/saldo/${userId}`),
  solicitarRecarga: (monto)  => api.post('/billing/solicitar-recarga', { monto }),
};

// Conductores disponibles cerca (para "X conductores cerca" al buscar)
export const cercanosApi = {
  conductores: (lat, lng, tipoServicio, radioKm = 5) =>
    api.get('/locations/conductores/cercanos', {
      params: { lat, lng, tipo_servicio: tipoServicio, radio_km: radioKm },
    }),
};

export default api;
