# FitMon — AI Fitness Monitoring Platform

FitMon is a real-time fitness monitoring system that tracks bicep curls using Computer Vision (MediaPipe) and sensor fusion. It features a decentralized architecture where processing happens on the client-side (Web or Python) and results are synced to a central dashboard with AI-powered coaching insights.

## Project Structure

- **/backend**: Node.js + Socket.IO server (SaaS layer, data fusion, Firestore & Gemini integration).
- **/frontend**: React + Vite + Tailwind v4 (Real-time dashboard and web-based tracking).
- **/cv**: Python 3.10 module (Autonomous CV engine for dedicated camera/IoT setups).

---

## 🚀 Getting Started

Ensure you have **Node.js 18+** and **Python 3.10+** installed.

### 1. Backend Setup
```bash
cd backend
npm install
# Optional: Add your .env and serviceAccountKey.json for Firebase/Gemini
npm run dev
```
*Server runs on: http://localhost:3001*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Dashboard runs on: http://localhost:5173*

Web mode only needs `backend` + `frontend`.
Do not run the Python CV window while using the website, because both apps compete for the same webcam.

### 3. Python CV Engine Setup
```bash
cd cv
# Activate the pre-created virtual environment
# Windows:
./venv/Scripts/activate
# Install dependencies (if not already done)
pip install -r requirements.txt
# Run the CV engine
python main.py
```
Use this only for standalone desktop CV testing or dedicated camera/IoT setups.

**CV Controls:**
- `S`: Start Session
- `E`: End Session
- `Q`: Quit

---

## 🛠 Features

- **Decentralized Processing**: CV logic runs locally in the browser or via Python for <200ms latency.
- **Biomechanical Analysis**: Detects elbow stability, range of motion, and movement smoothness.
- **Sensor Fusion**: Integrates ESP32 FSR data for muscle engagement tracking.
- **AI Coach**: Uses Gemini AI to analyze your session and provide form improvements.
- **Sleek UI**: Premium dark theme with glassmorphism and real-time data visualization.
