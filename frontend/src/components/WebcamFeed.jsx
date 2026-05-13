import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Camera, CircleAlert } from 'lucide-react';
import Webcam from 'react-webcam';
import {
  closePoseDetector,
  detectPose,
  drawLandmarks,
  initializePoseDetector,
} from '../services/poseDetector';
import socketService from '../services/socketService';
import useSessionStore from '../stores/useSessionStore';
import { BicepCurlEngine } from '../utils/cvLogic';

const FRAME_INTERVAL = 100;
const curlEngine = new BicepCurlEngine();

export default function WebcamFeed({ enableFrameStreaming = true }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastFrameTime = useRef(0);
  const repQualityRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  const sessionActive = useSessionStore((s) => s.sessionActive);
  const setPoseReady = useSessionStore((s) => s.setPoseReady);
  const updateFeedback = useSessionStore((s) => s.updateFeedback);
  const resetLiveFeedback = useSessionStore((s) => s.resetLiveFeedback);
  const angle = useSessionStore((s) => s.angle);
  const repCount = useSessionStore((s) => s.repCount);
  const repState = useSessionStore((s) => s.repState);
  const repQuality = useSessionStore((s) => s.repQuality);
  const postureScore = useSessionStore((s) => s.postureScore);
  const smoothness = useSessionStore((s) => s.smoothness);

  const liveQuality = repCount > 0
    ? ((postureScore < 75 || smoothness < 65) ? 'BAD' : (repQuality || 'GOOD'))
    : null;
  const qualityLabel = (liveQuality || '').toUpperCase();

  useEffect(() => {
    repQualityRef.current = liveQuality;
  }, [liveQuality]);

  useEffect(() => {
    curlEngine.reset();
    if (!sessionActive) {
      resetLiveFeedback();
    }
  }, [resetLiveFeedback, sessionActive]);

  useEffect(() => {
    initializePoseDetector(() => {
      setPoseReady(true);
    });

    return () => {
      closePoseDetector();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [setPoseReady]);

  const handleUserMedia = useCallback(() => {
    setCameraError('');
  }, []);

  useEffect(() => {
    let frameTimer = null;
    if (!sessionActive || !enableFrameStreaming) {
      return () => {
        if (frameTimer) clearInterval(frameTimer);
      };
    }

    const sendFrame = () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.6);
        socketService.sendVideoFrame(imageData, Date.now());
      } catch {
        // ignore frame capture errors
      }
    };

    frameTimer = setInterval(sendFrame, 500);

    return () => {
      if (frameTimer) clearInterval(frameTimer);
    };
  }, [enableFrameStreaming, sessionActive]);

  const handleUserMediaError = useCallback((error) => {
    const message = error?.name === 'NotReadableError'
      ? 'Camera is busy. Close other apps using the camera and refresh this page.'
      : 'Camera access failed. Allow browser camera permission and try again.';

    setPoseReady(false);
    setCameraError(message);
  }, [setPoseReady]);

  useEffect(() => {
    function processFrame() {
      const now = performance.now();
      if (now - lastFrameTime.current < FRAME_INTERVAL) {
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTime.current = now;

      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      const landmarks = detectPose(video, now);

      if (landmarks) {
        const quality = (repQualityRef.current || '').toUpperCase();
        const overlayStyle = quality === 'GOOD'
          ? { connectorColor: '#2ecc7188', landmarkColor: '#d5f8e1', accentColor: '#2ecc71' }
          : quality === 'BAD'
            ? { connectorColor: '#ff6b6b88', landmarkColor: '#ffe3e3', accentColor: '#ff4d4f' }
            : undefined;

        drawLandmarks(ctx, landmarks, canvas.width, canvas.height, overlayStyle);
        if (sessionActive) {
          const results = curlEngine.processFrame(landmarks, Date.now());
          updateFeedback(results);

          if (results.valid) {
            socketService.sendCVResults({
              ...results,
              landmarks,
            });
          }
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(processFrame);
    }

    animationRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sessionActive, updateFeedback]);

  return (
    <div className="camera-shell">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        className="camera-layer"
        onUserMedia={handleUserMedia}
        onUserMediaError={handleUserMediaError}
        videoConstraints={{
          width: 640,
          height: 480,
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 },
        }}
      />
      <canvas
        ref={canvasRef}
        className="camera-layer"
        style={{ transform: 'scaleX(-1)' }}
      />

      <div className="camera-gradient" />

      {cameraError ? (
        <div className="camera-error">
          <CircleAlert className="icon-md" />
          <div>
            <strong>Camera unavailable</strong>
            <p>{cameraError}</p>
          </div>
        </div>
      ) : null}

      <div className="camera-hud">
        <div className="camera-chip">
          <Camera className="icon-sm" />
          <span>Live Camera</span>
        </div>

        {sessionActive && (
          <div className="camera-chip camera-chip--live">
            <span className="camera-dot" />
            <span>Session Live</span>
          </div>
        )}

        {qualityLabel && (
          <div className="camera-chip">
            <span className={qualityLabel === 'GOOD' ? 'text-success' : 'text-danger'}>
              {qualityLabel === 'GOOD' ? 'GOOD REP' : 'BAD REP'}
            </span>
          </div>
        )}
      </div>

      <div className="camera-tip">
        {cameraError ? (
          <>
            <CircleAlert className="icon-sm" />
            <span>Camera access is unavailable. Close other apps using the camera and refresh.</span>
          </>
        ) : sessionActive ? (
          <>
            <Activity className="icon-sm" />
            <span>Move smoothly and complete each rep through the full range.</span>
          </>
        ) : (
          <>
            <CircleAlert className="icon-sm" />
            <span>Allow camera access, then press Start Session to begin.</span>
          </>
        )}
      </div>

      <div className="camera-stats">
        <div className="camera-stat">
          <span className="camera-label">Reps</span>
          <strong>{repCount}</strong>
        </div>
        <div className="camera-stat">
          <span className="camera-label">Angle</span>
          <strong>{angle}&deg;</strong>
        </div>
        <div className="camera-stat">
          <span className="camera-label">Phase</span>
          <strong>{repState}</strong>
        </div>
        <div className="camera-stat">
          <span className="camera-label">Form</span>
          <strong>{postureScore}</strong>
        </div>
      </div>
    </div>
  );
}
