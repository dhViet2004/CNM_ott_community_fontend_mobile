import { Audio } from 'expo-av';

let incomingSound: Audio.Sound | null = null;
let outgoingSound: Audio.Sound | null = null;

export const setupAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('Failed to set audio mode:', error);
  }
};

export const playIncomingRingtone = async () => {
  console.log('[AudioUtils] playIncomingRingtone called');
  try {
    await stopRingtone();
    await setupAudioMode();
    console.log('[AudioUtils] Creating sound for incoming...');
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/nhacchuong.mp3'),
      { shouldPlay: true, isLooping: true }
    );
    incomingSound = sound;
    console.log('[AudioUtils] playIncomingRingtone success');
  } catch (err) {
    console.error('[AudioUtils] Error playing incoming ringtone:', err);
  }
};

export const playOutgoingRingtone = async () => {
  console.log('[AudioUtils] playOutgoingRingtone called');
  try {
    await stopRingtone();
    await setupAudioMode();
    console.log('[AudioUtils] Creating sound for outgoing...');
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/nhaccho.mp3'),
      { shouldPlay: true, isLooping: true }
    );
    outgoingSound = sound;
    console.log('[AudioUtils] playOutgoingRingtone success');
  } catch (err) {
    console.error('[AudioUtils] Error playing outgoing ringtone:', err);
  }
};

export const stopRingtone = async () => {
  console.log('[AudioUtils] stopRingtone called');
  try {
    if (incomingSound) {
      await incomingSound.stopAsync();
      await incomingSound.unloadAsync();
      incomingSound = null;
    }
    if (outgoingSound) {
      await outgoingSound.stopAsync();
      await outgoingSound.unloadAsync();
      outgoingSound = null;
    }
  } catch (err) {
    console.error('[AudioUtils] Error stopping ringtone:', err);
  }
};
