"""
Video camera streaming using OpenCV
Provides MJPEG streaming for web browser compatibility
"""
import cv2
import logging
from typing import Generator
from config import settings

logger = logging.getLogger(__name__)


class VideoCamera:
    """
    Manages webcam capture and MJPEG streaming

    Uses OpenCV to capture frames and encode them as JPEG for streaming
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

        # Warm up the camera
        for _ in range(5):
            self.video.read()

        logger.info(
            f"Camera initialized: {settings.CAMERA_WIDTH}x{settings.CAMERA_HEIGHT} @ {settings.CAMERA_FPS}fps"
        )

    def get_frame(self) -> bytes:
        """
        Capture a single frame from the camera

        Returns:
            bytes: JPEG encoded frame

        Raises:
            Exception: If frame cannot be captured
        """
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

    def generate_frames(self) -> Generator[bytes, None, None]:
        """
        Generate MJPEG stream frames

        Yields:
            bytes: Multipart MJPEG frame with boundary

        This generator is designed to work with FastAPI StreamingResponse
        for real-time video streaming to web browsers
        """
        while True:
            try:
                frame = self.get_frame()

                # Yield frame in multipart format
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
                )

            except Exception as e:
                logger.error(f"Error generating frame: {e}")
                break

    def release(self):
        """Release the camera resource"""
        if self.video.isOpened():
            self.video.release()
            logger.info("Camera released")

    def __del__(self):
        """Cleanup camera on object destruction"""
        self.release()
