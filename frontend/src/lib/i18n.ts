// App strings, EN and ES. Spanish is neutral standard Spanish (no voseo), which is the only exception to
// the English-everywhere rule: these are user-facing UI strings, not repo content.
import { useShellLang } from '@fasl-work/caos-app-shell';

export type Dict = Record<string, { en: string; es: string }>;

export const S: Dict = {
  truck: { en: 'Truck', es: 'Camión' },
  detector: { en: 'Detector', es: 'Detector' },
  channel: { en: 'Channel', es: 'Canal' },
  healthy: { en: 'Healthy', es: 'Sano' },
  faulty: { en: 'With a fault', es: 'Con falla' },
  arm_raw: { en: 'raw channel', es: 'canal crudo' },
  arm_residual: { en: 'within-regime residual', es: 'residuo intra-régimen' },
  tab_signal: { en: 'Signal', es: 'Señal' },
  tab_detector: { en: 'Detector', es: 'Detector' },
  tab_regimes: { en: 'Regimes', es: 'Regímenes' },
  tab_fleet: { en: 'Fleet', es: 'Flota' },
  onset: { en: 'true onset', es: 'inicio real' },
  threshold: { en: 'fleet threshold', es: 'umbral de flota' },
  alarms: { en: 'alarms', es: 'alarmas' },
  baseline_end: { en: 'baseline ends', es: 'fin de línea base' },
  regime_band: { en: 'regime', es: 'régimen' },
  delay: { en: 'Detection delay', es: 'Retardo de detección' },
  delay_raw: { en: 'Delay, raw', es: 'Retardo, crudo' },
  delay_res: { en: 'Delay, residual', es: 'Retardo, residuo' },
  no_detection: { en: 'never detected', es: 'nunca detectado' },
  no_fault: { en: 'no fault, so no detection is possible', es: 'sin falla, no hay detección posible' },
  minutes: { en: 'min', es: 'min' },
  min_since_start: { en: 'minutes since the record starts', es: 'minutos desde el inicio del registro' },
  false_alarms: { en: 'False alarms before onset', es: 'Falsas alarmas antes del inicio' },
  coverage: { en: 'Regime coverage', es: 'Cobertura de regímenes' },
  fault_kind: { en: 'Fault', es: 'Falla' },
  fault_none: { en: 'none', es: 'ninguna' },
  focus: { en: 'Focus view', es: 'Vista foco' },
  back: { en: 'Back to the App', es: 'Volver a la App' },
  loading: { en: 'Loading the truck record', es: 'Cargando el registro del camión' },
  load_failed: { en: 'The truck record could not be loaded.', es: 'No se pudo cargar el registro del camión.' },
  faster: { en: 'faster', es: 'más rápido' },
  slower: { en: 'slower', es: 'más lento' },
  statistic: { en: 'detector statistic', es: 'estadístico del detector' },
  value: { en: 'value', es: 'valor' },
  which_faster: { en: 'Which arm detected first', es: 'Qué brazo detectó primero' },
  tie: { en: 'neither', es: 'ninguno' },
};

export function useT() {
  const lang = useShellLang();
  return (key: string) => {
    const e = S[key];
    if (!e) return key;
    return lang === 'es' ? e.es : e.en;
  };
}

export function useLang(): 'en' | 'es' {
  return useShellLang() === 'es' ? 'es' : 'en';
}

/** Channel labels, kept out of the main dictionary because there are many and they are mechanical. */
export const CHANNEL_LABEL: Record<string, { en: string; es: string }> = {
  payload_t: { en: 'Payload (t)', es: 'Carga útil (t)' },
  grade_pct: { en: 'Grade (%)', es: 'Pendiente (%)' },
  speed_kmh: { en: 'Speed (km/h)', es: 'Velocidad (km/h)' },
  strut_fl_bar: { en: 'Strut, front left (bar)', es: 'Suspensión, delantera izq. (bar)' },
  strut_fr_bar: { en: 'Strut, front right (bar)', es: 'Suspensión, delantera der. (bar)' },
  strut_rl_bar: { en: 'Strut, rear left (bar)', es: 'Suspensión, trasera izq. (bar)' },
  strut_rr_bar: { en: 'Strut, rear right (bar)', es: 'Suspensión, trasera der. (bar)' },
  tyre_pressure_kpa: { en: 'Tyre pressure (kPa)', es: 'Presión de neumático (kPa)' },
  tyre_temp_c: { en: 'Tyre temperature (C)', es: 'Temperatura de neumático (C)' },
  brake_temp_c: { en: 'Brake temperature (C)', es: 'Temperatura de freno (C)' },
  engine_temp_c: { en: 'Engine temperature (C)', es: 'Temperatura de motor (C)' },
  fuel_rate_lph: { en: 'Fuel rate (L/h)', es: 'Consumo de combustible (L/h)' },
};

export const FAULT_LABEL: Record<string, { en: string; es: string }> = {
  none: { en: 'Healthy', es: 'Sano' },
  strut_leak: { en: 'Strut leak', es: 'Fuga en suspensión' },
  tyre_leak: { en: 'Tyre leak', es: 'Fuga en neumático' },
  brake_drag: { en: 'Brake drag', es: 'Freno rozando' },
  cooling_loss: { en: 'Cooling loss', es: 'Pérdida de refrigeración' },
};

export const label = (map: Record<string, { en: string; es: string }>, key: string, lang: 'en' | 'es') =>
  map[key] ? map[key][lang] : key;
