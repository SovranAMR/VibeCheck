'use client';

import React, { useRef, useEffect } from 'react';
import { useAudioEngine } from '@/stores/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyser } = useAudioEngine();

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    let animationFrameId: number;
    let time = 0;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Get both time domain and frequency domain data
      analyser.getByteTimeDomainData(dataArray);
      const freqData = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(freqData);

      // Clear canvas with gradient background
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.1)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.3)');
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        time += 0.02;
        
        // Draw frequency bars (spectrum)
        const barWidth = canvas.width / (bufferLength / 4);
        for (let i = 0; i < bufferLength / 4; i++) {
          const barHeight = (freqData[i] / 255) * canvas.height * 0.6;
          const x = i * barWidth;
          const y = canvas.height - barHeight;
          
          // Create gradient for each bar
          const barGradient = canvasCtx.createLinearGradient(0, y, 0, canvas.height);
          barGradient.addColorStop(0, `hsl(${200 + i * 2}, 70%, 60%)`);
          barGradient.addColorStop(1, `hsl(${200 + i * 2}, 70%, 30%)`);
          
          canvasCtx.fillStyle = barGradient;
          canvasCtx.fillRect(x, y, barWidth - 1, barHeight);
        }
        
        // Draw waveform overlay
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = `rgba(167, 139, 250, ${0.8 + 0.2 * Math.sin(time)})`;
        canvasCtx.beginPath();
        
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height / 2) + canvas.height / 2;
          
          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        canvasCtx.stroke();
        
        // Add pulsing center line
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.2 * Math.sin(time * 2)})`;
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        
        // Add floating particles
        for (let i = 0; i < 5; i++) {
          const particleX = (canvas.width / 5) * i + Math.sin(time + i) * 20;
          const particleY = canvas.height / 2 + Math.cos(time * 1.5 + i) * 30;
          const particleSize = 2 + Math.sin(time * 3 + i) * 2;
          
          canvasCtx.fillStyle = `rgba(167, 139, 250, ${0.6 + 0.4 * Math.sin(time + i)})`;
          canvasCtx.beginPath();
          canvasCtx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          canvasCtx.fill();
        }
      } else {
        // Idle state - subtle animation
        time += 0.01;
        canvasCtx.strokeStyle = `rgba(167, 139, 250, ${0.2 + 0.1 * Math.sin(time)})`;
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, analyser]);

  return (
    <div className={`transition-all duration-500 ${isPlaying ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          width="400" 
          height="120" 
          className="rounded-lg border border-purple-500/20 shadow-lg shadow-purple-500/10"
        />
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-purple-400 text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              🎵 Canlı
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioVisualizer;
