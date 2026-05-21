"use client";
import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "powertrack_tour_v1";

const ALL_STEPS = [
  {
    element: "#tour-new-session",
    popover: {
      title: "Registrar sesión",
      description:
        "Empezá acá cada vez que entrenes. Agregás ejercicios, series, peso y reps — todo queda guardado automáticamente.",
    },
  },
  {
    element: "#tour-stats",
    popover: {
      title: "Stats de la semana",
      description:
        "Ves cuántas sesiones hiciste, tu racha semanal, el volumen total y tu SBD estimado (sentadilla + banca + peso muerto).",
    },
  },
  {
    element: "#tour-prs",
    popover: {
      title: "Records personales",
      description:
        "Los mejores 1RM estimados de los tres grandes. Se actualizan solos cada vez que registrás una sesión.",
    },
  },
  {
    element: "#tour-nav-history",
    popover: {
      title: "Historial",
      description: "Revisá y editá todas tus sesiones anteriores.",
    },
  },
  {
    element: "#tour-nav-progress",
    popover: {
      title: "Progreso",
      description: "Gráficos de la evolución de tu 1RM en cualquier ejercicio a lo largo del tiempo.",
    },
  },
  {
    element: "#tour-nav-goals",
    popover: {
      title: "Metas",
      description: "Poné un objetivo de 1RM con fecha límite y seguí tu avance hacia él.",
    },
  },
  {
    element: "#tour-nav-stats",
    popover: {
      title: "Stats avanzadas",
      description:
        "Análisis detallado: distribución de carga por día, frecuencia de ejercicios, PR's históricos y más.",
    },
  },
  {
    element: "#tour-nav-calculators",
    popover: {
      title: "Calculadoras",
      description: "Calculá 1RM, Wilks, IPF Points, y visualizá exactamente qué discos cargar en la barra.",
    },
  },
  {
    element: "#tour-nav-bodyweight",
    popover: {
      title: "Peso corporal",
      description: "Registrá tu peso día a día para trackear tu composición corporal y Wilks histórico.",
    },
  },
  {
    element: "#tour-nav-templates",
    popover: {
      title: "Templates",
      description: "Guardá rutinas completas para cargarlas rápido cuando llegás al gym.",
    },
  },
  {
    element: "#tour-nav-profile",
    popover: {
      title: "Perfil",
      description: "Cambiá tu nombre o contraseña desde acá.",
    },
  },
  {
    element: "#tour-nav-blocks",
    popover: {
      title: "Bloques de entrenamiento",
      description: "Planificá tus mesociclos: volumen, intensidad, pico, descarga. La app te muestra el bloque activo y cuánto progresaste.",
    },
  },
  {
    element: "#tour-nav-competitions",
    popover: {
      title: "Competencias",
      description: "Registrá tus totales de competencia y compará automáticamente con tus PRs de entrenamiento.",
    },
  },
];

function startTour() {
  const steps = ALL_STEPS.filter(
    (s) => !s.element || document.querySelector(s.element) !== null
  );
  if (steps.length === 0) return;

  const driverObj = driver({
    showProgress: true,
    nextBtnText: "Siguiente →",
    prevBtnText: "← Atrás",
    doneBtnText: "¡Listo!",
    progressText: "{{current}} de {{total}}",
    steps,
    onDestroyStarted: () => {
      localStorage.setItem(STORAGE_KEY, "1");
      driverObj.destroy();
    },
  });
  driverObj.drive();
}

export default function DashboardTour() {
  useEffect(() => {
    window.addEventListener("powertrack:start-tour", startTour);
    return () => window.removeEventListener("powertrack:start-tour", startTour);
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(startTour, 900);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
