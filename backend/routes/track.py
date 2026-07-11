"""
WebSocket endpoint for live cell tracking.

The browser streams JPEG frames (from a webcam or an uploaded video) and gets
back per-frame track records and running unique counts. One CellTracker is
created per connection so each session has isolated ByteTrack state.
"""
import numpy as np
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool
from model.tracker import CellTracker

router = APIRouter()


@router.websocket("/ws/track")
async def ws_track(websocket: WebSocket):
    await websocket.accept()
    # Load the model off the event loop (~0.5s).
    tracker = await run_in_threadpool(CellTracker)
    await websocket.send_json({"type": "ready"})

    try:
        while True:
            data = await websocket.receive_bytes()

            frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                await websocket.send_json({"type": "error", "detail": "Could not decode frame"})
                continue

            # Inference is CPU-bound; run it in a thread so the loop stays responsive.
            result = await run_in_threadpool(tracker.track_frame, frame)
            result["type"] = "result"
            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
