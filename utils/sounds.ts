/**
 * Sound feedback utilities for barcode scanner
 * TODO: Add actual audio files to /public/sounds/ directory
 */

let audioContext: AudioContext | null = null;

// Initialize Web Audio API context (better performance than Audio elements)
const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

/**
 * Play success beep when product is found
 * Frequency: 800Hz, Duration: 100ms
 */
export const playBeep = () => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 800; // 800Hz - pleasant beep
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);

        console.log('🔊 BEEP - Producto encontrado');
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
};

/**
 * Play error sound when product is not found
 * Frequency: 200Hz, Duration: 200ms (lower, longer = error)
 */
export const playError = () => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 200; // 200Hz - lower frequency for error
        oscillator.type = 'sawtooth'; // Harsher sound for error

        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);

        console.log('🔊 ERROR - Producto no encontrado');
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
};

/**
 * Play warning sound when product has no stock
 * Frequency: 400Hz, Duration: 150ms (mid-range = warning)
 */
export const playStockError = () => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 400; // 400Hz - mid frequency for warning
        oscillator.type = 'triangle'; // Softer than error, harsher than success

        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);

        console.log('🔊 WARNING - Sin stock disponible');
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
};

/**
 * Alternative: Use HTML5 Audio with preloaded files
 * Uncomment and use if you prefer audio files over synthesized sounds
 */
/*
const beepAudio = new Audio('/sounds/beep.mp3');
const errorAudio = new Audio('/sounds/error.mp3');

beepAudio.volume = 0.5;
errorAudio.volume = 0.5;

export const playBeep = () => {
  beepAudio.currentTime = 0;
  beepAudio.play().catch(err => console.warn('Audio playback failed:', err));
};

export const playError = () => {
  errorAudio.currentTime = 0;
  errorAudio.play().catch(err => console.warn('Audio playback failed:', err));
};
*/
