"""
Video camera streaming using OpenCV
Provides MJPEG streaming for web browser compatibility
Optimized for Cloudflare proxy and multiple concurrent clients
"""
import cv2
import logging
import asyncio
import time
from typing import Generator, Optional
from threading import Thread, Lock
from collections import deque
from config import settings

logger = logging.getLogger(__name__)


class VideoCamera:
    """
    Manages webcam capture and MJPEG streaming

    Optimizations:
    - Frame caching: Single frame shared between multiple clients
    - Async frame capture: Non-blocking frame generation
    - Rate limiting: Controls FPS to reduce bandwidth
    - Keep-alive: Prevents Cloudflare timeout
    - Connection tracking: Monitors active streams
    """

    def __init__(self, camera_index: int = 0):
        """
        Initialize the video camera

        Args:
            camera_index: Camera device index (0 = default camera)

        Raises:
            Exception: If camera cannot be opened
        """
        self.camera_index = camera_index
        self.video = cv2.VideoCapture(camera_index)

        if not self.video.isOpened():
            raise Exception(f"Failed to open camera at index {camera_index}")

        # Configure camera settings
        self.video.set(cv2.CAP_PROP_FRAME_WIDTH, settings.CAMERA_WIDTH)
        self.video.set(cv2.CAP_PROP_FRAME_HEIGHT, settings.CAMERA_HEIGHT)
        self.video.set(cv2.CAP_PROP_FPS, settings.CAMERA_FPS)

        # Frame caching for multiple clients
        self.current_frame: Optional[bytes] = None
        self.frame_lock = Lock()
        self.last_frame_time = 0
        self.frame_interval = 1.0 / settings.STREAM_FPS

        # Client tracking
        self.active_clients = 0
        self.clients_lock = Lock()

        # Background frame capture thread
        self.capture_thread: Optional[Thread] = None
        self.is_running = False

        # Warm up the camera
        for _ in range(5):
            self.video.read()

        # Start background capture if frame caching is enabled
        if settings.ENABLE_FRAME_CACHE:
            self._start_capture_thread()

        logger.info(
            f"Camera initialized: {settings.CAMERA_WIDTH}x{settings.CAMERA_HEIGHT} @ {settings.CAMERA_FPS}fps"
        )
        logger.info(
            f"Streaming at {settings.STREAM_FPS}fps with frame caching: {settings.ENABLE_FRAME_CACHE}"
        )

    def _start_capture_thread(self):
        """Start background thread for continuous frame capture"""
        self.is_running = True
        self.capture_thread = Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        logger.info("Background frame capture thread started")

    def _capture_loop(self):
        """Background thread continuously captures frames at controlled rate"""
        while self.is_running:
            try:
                current_time = time.time()

                # Rate limiting: only capture if enough time has passed
                if current_time - self.last_frame_time >= self.frame_interval:
                    success, frame = self.video.read()

                    if success:
                        # Encode frame as JPEG
                        ret, jpeg = cv2.imencode(
                            '.jpg',
                            frame,
                            [cv2.IMWRITE_JPEG_QUALITY, settings.JPEG_QUALITY]
                        )

                        if ret:
                            with self.frame_lock:
                                self.current_frame = jpeg.tobytes()
                                self.last_frame_time = current_time
                    else:
                        logger.warning("Failed to capture frame in background thread")
                        time.sleep(0.1)
                else:
                    # Sleep until next frame is due
                    sleep_time = self.frame_interval - (current_time - self.last_frame_time)
                    if sleep_time > 0:
                        time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"Error in capture loop: {e}")
                time.sleep(0.1)

    def get_frame(self) -> bytes:
        """
        Get the current cached frame (if caching enabled) or capture a new one

        Returns:
            bytes: JPEG encoded frame

        Raises:
            Exception: If frame cannot be captured
        """
        if settings.ENABLE_FRAME_CACHE:
            # Return cached frame
            with self.frame_lock:
                if self.current_frame is None:
                    raise Exception("No frame available yet")
                return self.current_frame
        else:
            # Capture frame directly (legacy behavior)
            success, frame = self.video.read()

            if not success:
                raise Exception("Failed to capture frame from camera")

            # Encode frame as JPEG
            ret, jpeg = cv2.imencode(
                '.jpg',
                frame,
                [cv2.IMWRITE_JPEG_QUALITY, settings.JPEG_QUALITY]
            )

            if not ret:
                raise Exception("Failed to encode frame as JPEG")

            return jpeg.tobytes()

    async def generate_frames(self) -> Generator[bytes, None, None]:
        """
        Generate MJPEG stream frames with Cloudflare optimizations

        Features:
        - Rate limiting to control bandwidth
        - Keep-alive heartbeat to prevent timeout
        - Connection validation
        - Graceful error handling

        Yields:
            bytes: Multipart MJPEG frame with boundary

        This generator is designed to work with FastAPI StreamingResponse
        for real-time video streaming through Cloudflare proxy
        """
        # Register client
        with self.clients_lock:
            self.active_clients += 1
            client_id = self.active_clients

        logger.info(f"Client {client_id} connected. Total active clients: {self.active_clients}")

        try:
            last_heartbeat = time.time()
            frame_count = 0

            while True:
                try:
                    current_time = time.time()

                    # Get current frame (cached or fresh)
                    frame = self.get_frame()

                    # Yield frame in multipart format
                    yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n'
                        b'Content-Length: ' + str(len(frame)).encode() + b'\r\n'
                        b'\r\n' + frame + b'\r\n'
                    )

                    frame_count += 1

                    # Keep-alive heartbeat: send comment every N seconds
                    if current_time - last_heartbeat >= settings.HEARTBEAT_INTERVAL:
                        # MJPEG comment for keep-alive (ignored by browsers)
                        yield b'--frame\r\n'
                        yield b'Content-Type: text/plain\r\n'
                        yield b'\r\n'
                        yield b'heartbeat\r\n'
                        last_heartbeat = current_time
                        logger.debug(f"Client {client_id} heartbeat sent (frame {frame_count})")

                    # Rate limiting: wait before next frame
                    await asyncio.sleep(self.frame_interval)

                except Exception as e:
                    logger.error(f"Error generating frame for client {client_id}: {e}")
                    # Don't break immediately, try to recover
                    await asyncio.sleep(0.5)

        except asyncio.CancelledError:
            logger.info(f"Client {client_id} stream cancelled")
        except Exception as e:
            logger.error(f"Fatal error in stream for client {client_id}: {e}")
        finally:
            # Unregister client
            with self.clients_lock:
                self.active_clients -= 1
            logger.info(f"Client {client_id} disconnected. Total active clients: {self.active_clients}")

    def get_stats(self) -> dict:
        """Get streaming statistics"""
        return {
            "active_clients": self.active_clients,
            "frame_cache_enabled": settings.ENABLE_FRAME_CACHE,
            "stream_fps": settings.STREAM_FPS,
            "camera_resolution": f"{settings.CAMERA_WIDTH}x{settings.CAMERA_HEIGHT}",
            "jpeg_quality": settings.JPEG_QUALITY
        }

    def release(self):
        """Release the camera resource"""
        # Stop background thread
        self.is_running = False
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2.0)
            logger.info("Background capture thread stopped")

        if self.video.isOpened():
            self.video.release()
            logger.info("Camera released")

    def __del__(self):
        """Cleanup camera on object destruction"""
        self.release()
