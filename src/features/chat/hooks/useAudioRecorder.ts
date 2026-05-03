import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * Audio Recorder Hook cho mobile - tương tự web
 * Trả về audio blob/object để gửi lên server
 */
export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Quyền ghi âm',
            message: 'Ứng dụng cần quyền ghi âm để gửi tin nhắn thoại.',
            buttonNeutral: 'Hỏi sau',
            buttonNegative: 'Hủy',
            buttonPositive: 'Đồng ý',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.error('Error requesting audio permission:', err);
      return false;
    }
  }, []);

  /**
   * Setup audio mode
   */
  const setupAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      console.error('Error setting audio mode:', err);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert('Lỗi', 'Vui lòng cấp quyền ghi âm để sử dụng tính năng này.');
        return;
      }

      // Stop any existing recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      // Setup audio mode
      await setupAudioMode();

      // Create recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setAudioUri(null);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
    }
  }, [requestPermission, setupAudioMode]);

  const stopRecording = useCallback(async () => {
    try {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const recording = recordingRef.current;
      if (recording) {
        recordingRef.current = null;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri);
        setIsRecording(false);
        // Dừng audio mode recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    try {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      setAudioUri(null);
      setIsRecording(false);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error canceling recording:', error);
      setAudioUri(null);
      setIsRecording(false);
      setRecordingTime(0);
    }
  }, []);

  const resetAudio = useCallback(() => {
    setAudioUri(null);
  }, []);

  return {
    isRecording,
    audioUri,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
    requestPermission,
  };
};

export default useAudioRecorder;
