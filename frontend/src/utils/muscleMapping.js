export const exerciseList = [
  { id: 'pushups', label: 'Push-ups' },
  { id: 'pullups', label: 'Pull-ups' },
  { id: 'squats', label: 'Squats' },
  { id: 'lunges', label: 'Lunges' },
  { id: 'plank', label: 'Plank' },
  { id: 'shoulder_press', label: 'Shoulder press' },
  { id: 'bicep_curls', label: 'Bicep curls' },
  { id: 'tricep_dips', label: 'Tricep dips' },
];

export const exerciseToMuscles = {
  pushups: ['chest', 'triceps_left', 'triceps_right', 'shoulders_left', 'shoulders_right'],
  pullups: ['back', 'biceps_left', 'biceps_right'],
  squats: ['quads_left', 'quads_right', 'glutes', 'hamstrings_left', 'hamstrings_right'],
  lunges: ['quads_left', 'quads_right', 'glutes', 'hamstrings_left', 'hamstrings_right'],
  plank: ['abs', 'obliques_left', 'obliques_right'],
  shoulder_press: ['shoulders_left', 'shoulders_right', 'triceps_left', 'triceps_right'],
  bicep_curls: ['biceps_left', 'biceps_right'],
  tricep_dips: ['triceps_left', 'triceps_right', 'shoulders_left', 'shoulders_right'],
};

export const muscleDisplayNames = {
  chest: 'Chest',
  shoulders_left: 'Left shoulder',
  shoulders_right: 'Right shoulder',
  biceps_left: 'Left biceps',
  biceps_right: 'Right biceps',
  triceps_left: 'Left triceps',
  triceps_right: 'Right triceps',
  abs: 'Abs',
  obliques_left: 'Left oblique',
  obliques_right: 'Right oblique',
  quads_left: 'Left quad',
  quads_right: 'Right quad',
  hamstrings_left: 'Left hamstring',
  hamstrings_right: 'Right hamstring',
  calves_left: 'Left calf',
  calves_right: 'Right calf',
  back: 'Back',
  glutes: 'Glutes',
};

export function computeMuscleActivation(selectedExercises) {
  const counts = {};

  selectedExercises.forEach((exercise) => {
    const muscles = exerciseToMuscles[exercise] || [];
    muscles.forEach((muscle) => {
      counts[muscle] = (counts[muscle] || 0) + 1;
    });
  });

  const maxCount = Object.values(counts).reduce((max, value) => Math.max(max, value), 0);
  return { counts, maxCount };
}

export function buildWorkoutSummary(selectedExercises) {
  const { counts } = computeMuscleActivation(selectedExercises);
  const totalExercises = selectedExercises.length;
  const activeMuscles = Object.keys(counts).length;
  const totalActivations = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    totalExercises,
    activeMuscles,
    totalActivations,
  };
}
