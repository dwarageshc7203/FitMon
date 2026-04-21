import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

let poseLandmarker = null;
let isInitializing = false;

export async function initializePoseDetector(onReady) {
  if (poseLandmarker || isInitializing) return poseLandmarker;
  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    isInitializing = false;
    if (onReady) onReady();
    return poseLandmarker;
  } catch (error) {
    console.error('[Pose] Failed to initialize:', error);
    isInitializing = false;
    return null;
  }
}

export function detectPose(videoElement, timestamp) {
  if (!poseLandmarker || !videoElement) return null;

  try {
    const result = poseLandmarker.detectForVideo(videoElement, timestamp);
    if (result.landmarks?.length) {
      return result.landmarks[0];
    }

    return null;
  } catch {
    return null;
  }
}

export function drawLandmarks(canvasCtx, landmarks, canvasWidth, canvasHeight, style = {}) {
  if (!landmarks || !canvasCtx) return;

  canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  const drawingUtils = new DrawingUtils(canvasCtx);

  const connectorColor = style.connectorColor || '#f7c56b88';
  const landmarkColor = style.landmarkColor || '#fff6df';
  const accentColor = style.accentColor || '#ff7b54';

  drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: connectorColor,
    lineWidth: 3,
  });

  drawingUtils.drawLandmarks(landmarks, {
    color: landmarkColor,
    lineWidth: 1,
    radius: 3.5,
  });

  [11, 13, 15, 12, 14, 16].forEach((idx) => {
    const landmark = landmarks[idx];
    if (landmark && landmark.visibility > 0.5) {
      canvasCtx.beginPath();
      canvasCtx.arc(landmark.x * canvasWidth, landmark.y * canvasHeight, 6, 0, 2 * Math.PI);
      canvasCtx.fillStyle = accentColor;
      canvasCtx.fill();
      canvasCtx.strokeStyle = '#ffffff55';
      canvasCtx.lineWidth = 2;
      canvasCtx.stroke();
    }
  });
}

export function closePoseDetector() {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }
}
