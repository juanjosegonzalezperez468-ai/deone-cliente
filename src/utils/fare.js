import { GOOGLE_MAPS_KEY } from '../constants/config';

export const FARE_RULES = {
  moto_pasajero:  { min: 5500,  perKm: 1500, perMin: 50 },
  domicilio:      { min: 5500,  perKm: 1500, perMin: 50 },
  carro_pasajero: { min: 6000,  perKm: 1700, perMin: 50 },
  acarreo: null,
  grua:    null,
};

export const isNegotiable = (id) => FARE_RULES[id] === null;

export const isNocturno = () => {
  // Colombia UTC-5: nocturno entre 10pm (22h) y 5am
  const colombiaHour = (new Date().getUTCHours() - 5 + 24) % 24;
  return colombiaHour >= 22 || colombiaHour < 5;
};

export const calcFare = (km, minutes, serviceId) => {
  const r = FARE_RULES[serviceId];
  if (!r) return null;
  const base = Math.max(r.min, km * r.perKm + minutes * r.perMin);
  return isNocturno() ? Math.round(base * 1.2) : base;
};

export const getDirections = async (oLat, oLng, dLat, dLng) => {
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${oLat},${oLng}&destination=${dLat},${dLng}` +
    `&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') throw new Error(json.status);
  const leg = json.routes[0].legs[0];
  return {
    km: leg.distance.value / 1000,
    minutes: Math.ceil(leg.duration.value / 60),
  };
};
