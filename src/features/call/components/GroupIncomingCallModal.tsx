import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  clearGroupIncomingCall,
  setGroupStatus,
  setGroupCallCredentials,
} from '@store/slices/groupCallSlice';
import { socketActions } from '@api/socket';
import { callApi } from '@api/endpoints';
import type { RootStackParamList } from '@navigation/types';
import { playIncomingRingtone, stopRingtone } from '@utils/audioUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GroupIncomingCallModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const incomingCall = useAppSelector((s) => s.groupCall.incomingCall);
  const status = useAppSelector((s) => s.groupCall.status);

  const visible = incomingCall !== null && status === 'ringing';

  React.useEffect(() => {
    if (visible) {
      playIncomingRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [visible]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;

    try {
      const result = await callApi.acceptGroupCall(incomingCall.callId);

      dispatch(setGroupCallCredentials({
        channelName: result.channelName,
        uid: result.agoraUid,
        callId: result.sessionId,
        sessionId: result.sessionId,
        groupId: incomingCall.conversationId,
        callType: incomingCall.callType,
        isHost: false,
      }));
      dispatch(setGroupStatus('joining'));
      dispatch(clearGroupIncomingCall());

      navigation.navigate('GroupCall', {
        callId: result.sessionId,
        channelName: result.channelName,
        token: result.token,
        uid: result.agoraUid,
        callType: incomingCall.callType,
        groupId: incomingCall.conversationId,
        groupName: incomingCall.callerName,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể chấp nhận cuộc gọi';
      Alert.alert('Lỗi', msg);
      dispatch(clearGroupIncomingCall());
      dispatch(setGroupStatus('idle'));
    }
  }, [incomingCall, dispatch, navigation]);

  const handleReject = useCallback(() => {
    if (!incomingCall) return;
    socketActions.rejectGroupCall(incomingCall.callId);
    dispatch(clearGroupIncomingCall());
    dispatch(setGroupStatus('idle'));
  }, [incomingCall, dispatch]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';
  const callerName = incomingCall.callerName || 'Người dùng';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topSection}>
            <View style={styles.avatarCircle}>
              <Ionicons
                name={isVideo ? 'videocam' : 'call'}
                size={48}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.callTypeText}>
              {`Cuộc gọi nhóm ${isVideo ? 'video' : 'thoại'}`}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
              <Ionicons name="call" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Từ chối</Text>

            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
              <Ionicons
                name={isVideo ? 'videocam' : 'call'}
                size={32}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Chấp nhận</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callTypeText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
    paddingBottom: 48,
  },
  rejectButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default GroupIncomingCallModal;
