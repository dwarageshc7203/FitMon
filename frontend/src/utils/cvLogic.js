export const CURL_UP_THRESHOLD = 68;
export const CURL_DOWN_THRESHOLD = 138;
export const MIN_ROM_THRESHOLD = 78;
export const TARGET_ROM_THRESHOLD = 108;
export const MAX_CONTROLLED_VELOCITY = 210;
export const MIN_EXTENSION_ANGLE = 142;
export const MIN_STABLE_FRAMES = 4;
export const CALIBRATION_REP_TARGET = 4;
export const MIN_DYNAMIC_UP = 45;
export const MAX_DYNAMIC_UP = 90;
export const MIN_DYNAMIC_DOWN = 110;
export const MAX_DYNAMIC_DOWN = 170;
export const MIN_DYNAMIC_ROM = 60;
export const MAX_DYNAMIC_ROM = 130;
export const ROM_MIN_RATIO = 0.7;
export const ANGLE_SMOOTHING_ALPHA = 0.25;
export const DEBUG_ANGLE_LOG = false;

export function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  let angle = Math.abs((radians * 180) / Math.PI);

  if (angle > 180) {
    angle = 360 - angle;
  }

  return angle;
}

export function calculateDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function extractArmJoints(landmarks) {
  if (!landmarks || landmarks.length < 17) return null;

  const leftArm = {
    shoulder: landmarks[11],
    elbow: landmarks[13],
    wrist: landmarks[15],
  };

  const rightArm = {
    shoulder: landmarks[12],
    elbow: landmarks[14],
    wrist: landmarks[16],
  };

  const leftVis = (leftArm.shoulder.visibility + leftArm.elbow.visibility + leftArm.wrist.visibility) / 3;
  const rightVis = (rightArm.shoulder.visibility + rightArm.elbow.visibility + rightArm.wrist.visibility) / 3;

  return leftVis > rightVis
    ? { ...leftArm, side: 'left', visibility: leftVis }
    : { ...rightArm, side: 'right', visibility: rightVis };
}

export class BicepCurlEngine {
  constructor() {
    this.reset();
  }

  processFrame(landmarks, timestamp) {
    const joints = extractArmJoints(landmarks);
    if (!joints || joints.visibility < 0.5) {
      return { valid: false, message: 'Arm not visible' };
    }

    const upperArmLength = calculateDistance(joints.shoulder, joints.elbow);
    const forearmLength = calculateDistance(joints.elbow, joints.wrist);

    if (this.upperArmLength === null) {
      this.upperArmLength = upperArmLength;
    } else {
      this.upperArmLength = (this.upperArmLength * 0.9) + (upperArmLength * 0.1);
    }

    if (this.forearmLength === null) {
      this.forearmLength = forearmLength;
    } else {
      this.forearmLength = (this.forearmLength * 0.9) + (forearmLength * 0.1);
    }

    if (this.maxForearmExtension === null || forearmLength > this.maxForearmExtension) {
      this.maxForearmExtension = forearmLength;
    }

    const contractionRatio = this.maxForearmExtension
      ? Math.max(0.8, Math.min(1.05, forearmLength / this.maxForearmExtension))
      : 1;

    const rawAngle = calculateAngle(joints.shoulder, joints.elbow, joints.wrist);
    if (this.smoothedAngle === null) {
      this.smoothedAngle = rawAngle;
    } else {
      this.smoothedAngle = (ANGLE_SMOOTHING_ALPHA * rawAngle) + ((1 - ANGLE_SMOOTHING_ALPHA) * this.smoothedAngle);
    }
    const angle = this.smoothedAngle;

    if (DEBUG_ANGLE_LOG && this.frameCount % 10 === 0) {
      console.log('[CV] angle raw/smoothed:', Math.round(rawAngle), Math.round(angle));
    }

    let velocity = 0;
    if (this.prevAngle !== null && this.prevTime !== null) {
      const dt = (timestamp - this.prevTime) / 1000;
      if (dt > 0) {
        velocity = Math.abs(angle - this.prevAngle) / dt;
      }
    }

    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > 20) {
      this.velocityHistory.shift();
    }

    this.minAngle = Math.min(this.minAngle, angle);
    this.maxAngle = Math.max(this.maxAngle, angle);
    this.frameCount += 1;

    if (this.referenceElbowX === null) {
      this.referenceElbowX = joints.elbow.x;
    }

    if (this.referenceShoulderY === null) {
      this.referenceShoulderY = joints.shoulder.y;
    }

    const upThreshold = this.personalizedUpThreshold ?? CURL_UP_THRESHOLD;
    const downThreshold = this.personalizedDownThreshold ?? CURL_DOWN_THRESHOLD;
    const targetRom = this.personalizedTargetRom ?? TARGET_ROM_THRESHOLD;
    const minRomThreshold = Math.max(MIN_DYNAMIC_ROM, Math.round(targetRom * ROM_MIN_RATIO));
    const extensionThreshold = this.personalizedDownThreshold
      ? Math.min(175, Math.max(130, Math.round(this.personalizedDownThreshold + 4)))
      : MIN_EXTENSION_ANGLE;

    if (angle > downThreshold) {
      this.stage = 'DOWN';
    }

    let repCompleted = false;
    let repCorrect = false;
    const feedback = [];

    const elbowDrift = Math.abs(joints.elbow.x - this.referenceElbowX);
    const shoulderDrift = Math.abs(joints.shoulder.y - this.referenceShoulderY);
    const elbowStability = Math.max(0, 100 - elbowDrift * 720);
    const shoulderControl = Math.max(0, 100 - shoulderDrift * 900);
    const smoothnessSpread = this.velocityHistory.length
      ? Math.max(...this.velocityHistory) - Math.min(...this.velocityHistory)
      : 0;
    const meanVelocity = this.velocityHistory.length
      ? this.velocityHistory.reduce((sum, current) => sum + current, 0) / this.velocityHistory.length
      : 0;
    const smoothness = Math.max(0, 100 - Math.min(100, smoothnessSpread * 0.08));
    const speedControl = Math.max(0, 100 - Math.max(0, meanVelocity - MAX_CONTROLLED_VELOCITY) * 0.35);
    const postureScore = Math.round((elbowStability * 0.42) + (shoulderControl * 0.18) + (smoothness * 0.2) + (speedControl * 0.2));

    if (angle < upThreshold && this.stage === 'DOWN' && this.frameCount > MIN_STABLE_FRAMES) {
      this.stage = 'UP';
      repCompleted = true;
      this.totalReps += 1;

      const rom = this.maxAngle - this.minAngle;
      const romRatio = Math.min(1, rom / targetRom) * contractionRatio;
      const formScore = Math.round(
        Math.min(
          100,
          (Math.min(1, romRatio) * 35) +
            (elbowStability * 0.28) +
            (shoulderControl * 0.12) +
            (smoothness * 0.12) +
            (speedControl * 0.13),
        ),
      );

      repCorrect = formScore >= 64;
      if (repCorrect) {
        this.correctReps += 1;
      }

      if (rom < minRomThreshold) feedback.push('Curl higher and lower fully to hit full range of motion.');
      if (this.maxAngle < extensionThreshold) feedback.push('Open the elbow more at the bottom before the next rep.');
            if (this.calibrationReps < CALIBRATION_REP_TARGET) {
              this.calibrationMins.push(this.minAngle);
              this.calibrationMaxes.push(this.maxAngle);
              this.calibrationReps += 1;

              if (this.calibrationReps >= CALIBRATION_REP_TARGET) {
                const avgMin = this.calibrationMins.reduce((sum, value) => sum + value, 0) / this.calibrationMins.length;
                const avgMax = this.calibrationMaxes.reduce((sum, value) => sum + value, 0) / this.calibrationMaxes.length;
                const personalizedRom = Math.max(MIN_DYNAMIC_ROM, Math.min(MAX_DYNAMIC_ROM, avgMax - avgMin));
                this.personalizedUpThreshold = Math.max(MIN_DYNAMIC_UP, Math.min(MAX_DYNAMIC_UP, avgMin + 6));
                this.personalizedDownThreshold = Math.max(MIN_DYNAMIC_DOWN, Math.min(MAX_DYNAMIC_DOWN, avgMax - 6));
                this.personalizedTargetRom = personalizedRom;
              }
            }
      if (elbowStability < 72) feedback.push('Keep your elbow pinned to your torso and avoid drifting forward.');
      if (shoulderControl < 72) feedback.push('Relax the shoulder and stop shrugging during the curl.');
      if (smoothness < 68 || speedControl < 68) feedback.push('Slow the rep down and control both lifting and lowering.');

      const result = {
        valid: true,
        angle: Math.round(angle),
        repState: this.stage,
        repCompleted,
        repCorrect,
        repCount: this.totalReps,
        correctReps: this.correctReps,
        feedback,
        postureScore,
        formScore,
        elbowStability: Math.round(elbowStability),
        smoothness: Math.round(smoothness),
        speedControl: Math.round(speedControl),
        shoulderControl: Math.round(shoulderControl),
        minAngle: Math.round(this.minAngle),
        maxAngle: Math.round(this.maxAngle),
        armSide: joints.side,
      };

      this.minAngle = 180;
      this.maxAngle = 0;
      this.referenceElbowX = joints.elbow.x;
      this.referenceShoulderY = joints.shoulder.y;
      this.prevAngle = angle;
      this.prevTime = timestamp;

      return result;
    }

    if (this.stage === 'DOWN' && this.frameCount <= MIN_STABLE_FRAMES) {
      feedback.push('Hold your start position steady for a moment before the first rep.');
    } else {
      if (elbowStability < 68) feedback.push('Keep elbow steady and close to your side.');
      if (shoulderControl < 68) feedback.push('Avoid lifting the shoulder to finish the curl.');
      if (speedControl < 68) feedback.push('Reduce momentum and control the tempo.');
      if (angle < 82 && this.maxAngle - this.minAngle < minRomThreshold) feedback.push('Squeeze higher at the top to complete the rep.');
    }

    this.prevAngle = angle;
    this.prevTime = timestamp;

    return {
      valid: true,
      angle: Math.round(angle),
      repState: this.stage || 'READY',
      repCompleted,
      repCorrect,
      repCount: this.totalReps,
      feedback,
      postureScore,
      formScore: Math.round((elbowStability * 0.32) + (shoulderControl * 0.18) + (smoothness * 0.2) + (speedControl * 0.3)),
      elbowStability: Math.round(elbowStability),
      smoothness: Math.round(smoothness),
      speedControl: Math.round(speedControl),
      shoulderControl: Math.round(shoulderControl),
      minAngle: Math.round(this.minAngle),
      maxAngle: Math.round(this.maxAngle),
      armSide: joints.side,
    };
  }

  reset() {
    this.stage = null;
    this.totalReps = 0;
    this.correctReps = 0;
    this.minAngle = 180;
    this.maxAngle = 0;
    this.velocityHistory = [];
    this.prevAngle = null;
    this.prevTime = null;
    this.smoothedAngle = null;
    this.referenceElbowX = null;
    this.referenceShoulderY = null;
    this.frameCount = 0;
    this.upperArmLength = null;
    this.forearmLength = null;
    this.maxForearmExtension = null;
    this.calibrationReps = 0;
    this.calibrationMins = [];
    this.calibrationMaxes = [];
    this.personalizedUpThreshold = null;
    this.personalizedDownThreshold = null;
    this.personalizedTargetRom = null;
  }
}
