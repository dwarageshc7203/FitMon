import { computeMuscleActivation } from '../utils/muscleMapping';

const getColor = (intensity) => {
  if (!intensity) return "#e5e7eb";
  if (intensity < 2) return "#fecaca";
  if (intensity < 4) return "#f87171";
  return "#b91c1c";
};

export default function MuscleHeatmap({ selectedExercises = [], selectedMuscles = [] }) {
  const muscleActivation = computeMuscleActivation([...selectedExercises, ...selectedMuscles]).counts;

  const fill = (muscle) => getColor(muscleActivation[muscle]);

  return (
    <svg viewBox="0 0 200 400" className="w-full max-w-sm mx-auto">

      {/* HEAD */}
      <circle cx="100" cy="40" r="20" fill="#ddd" />

      {/* SHOULDERS */}
      <path id="shoulders_left" d="M60 70 Q80 50 100 70 L90 90 Q70 90 60 70 Z" fill={fill("shoulders_left")} />
      <path id="shoulders_right" d="M140 70 Q120 50 100 70 L110 90 Q130 90 140 70 Z" fill={fill("shoulders_right")} />

      {/* CHEST */}
      <path id="chest" d="M80 90 Q100 80 120 90 L120 130 Q100 140 80 130 Z" fill={fill("chest")} />

      {/* ABS */}
      <path id="abs" d="M85 130 L115 130 L110 180 L90 180 Z" fill={fill("abs")} />

      {/* BICEPS */}
      <path id="biceps_left" d="M50 100 Q65 95 70 120 Q65 140 50 130 Z" fill={fill("biceps_left")} />
      <path id="biceps_right" d="M150 100 Q135 95 130 120 Q135 140 150 130 Z" fill={fill("biceps_right")} />

      {/* TRICEPS */}
      <path id="triceps_left" d="M50 130 Q65 140 60 170 Q45 160 50 130 Z" fill={fill("triceps_left")} />
      <path id="triceps_right" d="M150 130 Q135 140 140 170 Q155 160 150 130 Z" fill={fill("triceps_right")} />

      {/* QUADS */}
      <path id="quads_left" d="M85 180 L70 260 L90 260 L95 180 Z" fill={fill("quads_left")} />
      <path id="quads_right" d="M115 180 L130 260 L110 260 L105 180 Z" fill={fill("quads_right")} />

      {/* CALVES */}
      <path id="calves_left" d="M70 260 L75 330 L90 330 L90 260 Z" fill={fill("calves_left")} />
      <path id="calves_right" d="M130 260 L125 330 L110 330 L110 260 Z" fill={fill("calves_right")} />

    </svg>
  );
}