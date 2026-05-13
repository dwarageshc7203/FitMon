import useSessionStore from '../stores/useSessionStore';

const SOCKET_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:3001';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/ws';

const toWebSocketUrl = (url) => {
  if (url.startsWith('ws://') || url.startsWith('wss://')) return url;
  if (url.startsWith('https://')) return url.replace('https://', 'wss://');
  if (url.startsWith('http://')) return url.replace('http://', 'ws://');
  return `ws://${url}`;
};

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.manualClose = false;
    this.pendingCoachCode = false;
  }

  connect(token) {
    if (!token) {
      return;
    }

    this.token = token;
    if (this.socket) {
      this.socket.close();
    }

    this.manualClose = false;
    this.openSocket();
  }

  openSocket() {
    const wsBase = toWebSocketUrl(SOCKET_BASE_URL);
    const wsUrl = `${wsBase}${SOCKET_PATH}?token=${encodeURIComponent(this.token)}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      useSessionStore.getState().setConnected(true);
      useSessionStore.getState().setSocketError('');
      if (this.pendingCoachCode) {
        this.pendingCoachCode = false;
        this.send('create_coach_session_code', {});
      }
    };

    this.socket.onclose = () => {
      useSessionStore.getState().setConnected(false);
      if (!this.manualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts += 1;
        setTimeout(() => this.openSocket(), this.reconnectDelay);
      }
    };

    this.socket.onerror = () => {
      useSessionStore.getState().setSocketError('WebSocket connection error');
    };

    this.socket.onmessage = (event) => {
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const eventName = payload?.event;
      const data = payload?.data;

      if (!eventName) {
        return;
      }

      switch (eventName) {
        case 'session_started':
          useSessionStore.getState().setSessionId(data?.sessionId || null);
          useSessionStore.getState().setSessionActive(true);
          break;
        case 'coach_session_code':
          useSessionStore.getState().setCoachSessionCode(data?.code || '');
          break;
        case 'coached_session_report':
          useSessionStore.getState().pushCoachedReport(data || null);
          break;
        case 'athlete_video_frame':
          useSessionStore.getState().setAthleteVideoFrame(data || null);
          break;
        case 'feedback':
          if (data?.type === 'warning') {
            useSessionStore.getState().updateFeedback({
              feedback: data?.message ? [data.message] : [],
            });
            return;
          }
          useSessionStore.getState().updateFeedback(data || {});
          break;
        case 'session_summary':
          useSessionStore.getState().setReport(data || null);
          break;
        case 'error':
          if (data?.message) {
            useSessionStore.getState().setSocketError(data.message);
          }
          break;
        default:
          break;
      }
    };
  }

  disconnect() {
    this.manualClose = true;
    this.pendingCoachCode = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(event, data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  startSession(payload = {}) {
    this.send('start_session', payload);
  }

  createCoachSessionCode() {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.pendingCoachCode = true;
      return;
    }
    this.send('create_coach_session_code', {});
  }

  sendCVResults(results) {
    this.send('cv_results', results);
  }

  sendIoTData(value, timestamp = Date.now()) {
    this.send('iot_data', { value, timestamp });
  }

  sendVideoFrame(imageData, timestamp = Date.now()) {
    this.send('video_frame', { imageData, timestamp });
  }

  endSession() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      useSessionStore.getState().setGeneratingReport(true);
      this.send('end_session', {});
    }
  }
}

const socketService = new SocketService();
export default socketService;
