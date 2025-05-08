import React, { useEffect, useRef } from "react";

const AudioWaveform = ({ isListening }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const previousValuesRef = useRef([]); //Store previous values for smoothing

  useEffect(() => {
    let audioContext;

    const setupAudio = async () => {
      if (!isListening) return;

      try {
        // Create audio context and analyzer
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 512; // Increased for more detail
        analyzerRef.current.smoothingTimeConstant = 0.6; // Add smoothing (0.0-1.0)

        // Get audio stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        sourceRef.current = audioContext.createMediaStreamSource(stream);
        sourceRef.current.connect(analyzerRef.current);

        // Set up data array for visualization
        const bufferLength = analyzerRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        // Initialize previous values array
        previousValuesRef.current = new Array(100).fill(0);

        // Start animation
        animateWaveform();
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    };

    const animateWaveform = () => {
      if (!canvasRef.current || !analyzerRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Get frequency data
      analyzerRef.current.getByteFrequencyData(dataArrayRef.current);

      // Draw visualization in the style of the image
      const barCount = 100; // More bars for dense appearance
      const barWidth = 1; // Very thin bars like in the image
      const spacing = 1; // Less spacing for denser pattern
      const barWidthWithSpacing = barWidth + spacing;

      // Use a center line approach to create symmetry
      const centerY = height / 2;

      // Start position to center the visualization
      const startX = (width - barCount * barWidthWithSpacing) / 2;

      // Draw the dots/bars
      ctx.fillStyle = "black";

      // Calculate average energy for noise floor detection
      let totalEnergy = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        totalEnergy += dataArrayRef.current[i];
      }
      const avgEnergy = totalEnergy / dataArrayRef.current.length;

      // Noise floor threshold (adjust as needed)
      const noiseThreshold = 15;

      // Speech activity detection
      const isSpeaking = avgEnergy > noiseThreshold * 1.5;

      for (let i = 0; i < barCount; i++) {
        // Sample data points
        const dataIndex = Math.floor(
          (i / barCount) * dataArrayRef.current.length
        );
        let value = dataArrayRef.current[dataIndex] || 0;

        // Apply noise gate - reduce values below threshold
        if (value < noiseThreshold) {
          value = value * 0.1; // Greatly reduce noise
        } else {
          // Apply non-linear scaling to emphasize speech
          // Use a power curve for more dramatic effect on speech
          value = Math.pow(value / 255, 0.7) * 255;
        }

        // Add smoothing with previous values (temporal smoothing)
        const prevValue = previousValuesRef.current[i] || 0;
        value = prevValue * 0.4 + value * 0.6; // Weighted average
        previousValuesRef.current[i] = value;

        // Add small amount of randomness but less than before
        const randomFactor = isSpeaking ? 0.1 : 0.05;
        value = value * (0.95 + Math.random() * randomFactor);

        // Increase amplitude for speech while keeping noise low
        let amplificationFactor = 1;
        if (value > noiseThreshold) {
          // Progressive amplification - stronger for higher values
          amplificationFactor = 1 + (value / 255) * 0.8;
        }

        // Calculate bar height based on audio data with amplification
        const barHeight = Math.max(
          1,
          (value / 255) * (height * 0.4) * amplificationFactor
        );

        // Calculate x position
        const x = startX + i * barWidthWithSpacing;

        // Draw top bar
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);

        // Draw bottom bar (mirrored)
        ctx.fillRect(x, centerY, barWidth, barHeight);
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(animateWaveform);
    };

    setupAudio();

    return () => {
      // Clean up
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isListening]);

  return (
    <canvas
      ref={canvasRef}
      width={"200"}
      height={"40"}
      className={`w-full max-w-[200px]`}
    />
  );
};

export default AudioWaveform;
