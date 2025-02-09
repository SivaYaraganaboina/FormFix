document.addEventListener("DOMContentLoaded", async function () {
  const videoInput = document.getElementById("video-upload");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadedVideo = document.getElementById("uploaded-video");
  const feedback = document.getElementById("feedback");
  const canvas = document.getElementById("pose-overlay");
  const ctx = canvas.getContext("2d");

  uploadBtn.addEventListener("click", async function () {
    const file = videoInput.files[0];

    if (!file) {
      alert("Please select a video file first.");
      return;
    }

    console.log("File selected:", file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "formfix_upload"); // Replace with your Cloudinary preset

    try {
      console.log("Uploading...");
      const response = await fetch("https://api.cloudinary.com/v1_1/dgnqse4cu/video/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Response:", data);

      if (!data.secure_url) {
        throw new Error("Upload failed: " + JSON.stringify(data));
      }

      uploadedVideo.src = data.secure_url;
      uploadedVideo.style.display = "block";

      uploadedVideo.onloadeddata = () => {
        analyzePose();
      };
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Upload failed! See console for details.");
    }
  });

  async function analyzePose() {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`, // Use the correct path
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      drawResults(results);
    });

    const videoCanvas = document.createElement("canvas");
    const videoCtx = videoCanvas.getContext("2d");

    function processFrame() {
      if (!uploadedVideo.paused && !uploadedVideo.ended) {
        videoCanvas.width = uploadedVideo.videoWidth;
        videoCanvas.height = uploadedVideo.videoHeight;

        videoCtx.drawImage(uploadedVideo, 0, 0, videoCanvas.width, videoCanvas.height);
        pose.send({ image: videoCanvas });
        requestAnimationFrame(processFrame);
      }
    }

    uploadedVideo.play();
    processFrame();
  }

  function drawResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = uploadedVideo.videoWidth;
    canvas.height = uploadedVideo.videoHeight;

    if (results.poseLandmarks) {
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], // Arms
        [9, 10], [11, 12], [12, 14], [14, 16], [11, 13], [13, 15], // Upper body
        [12, 24], [24, 26], [26, 28], [28, 32], [11, 23], [23, 25], [25, 27], [27, 31] // Legs
      ];

      ctx.strokeStyle = "red";
      ctx.lineWidth = 4;

      // Draw connections (red rods)
      connections.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end]) {
          const startX = results.poseLandmarks[start].x * canvas.width;
          const startY = results.poseLandmarks[start].y * canvas.height;
          const endX = results.poseLandmarks[end].x * canvas.width;
          const endY = results.poseLandmarks[end].y * canvas.height;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      });

      // Draw keypoints
      results.poseLandmarks.forEach((landmark) => {
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      });
    }
  }
});
