import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { endGroupCall } from '@store/slices/groupCallSlice';
import { callApi } from '@api/endpoints';
import { playOutgoingRingtone, stopRingtone } from '@utils/audioUtils';
import type { RootStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GroupOutgoingCallModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();

  const status = useAppSelector((s) => s.groupCall.status);
  const isHost = useAppSelector((s) => s.groupCall.isHost);
  const callType = useAppSelector((s) => s.groupCall.callType);
  const sessionId = useAppSelector((s) => s.groupCall.sessionId);
  
  const callId = useAppSelector((s) => s.groupCall.callId);
  const channelName = useAppSelector((s) => s.groupCall.channelName);
  const token = useAppSelector((s) => s.groupCall.token);
  const uid = useAppSelector((s) => s.groupCall.uid);
  const groupId = useAppSelector((s) => s.groupCall.groupId);
  const groupName = useAppSelector((s) => s.groupCall.groupName);

  const visible = status === 'joining' && isHost;
  const wasVisibleRef = React.useRef(visible);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      playOutgoingRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [visible]);

  // Navigate when someone answers (status becomes connected or active)
  useEffect(() => {
    if ((status === 'connected' || status === 'active') && isHost && callId && channelName && token && uid !== null && groupId) {
      wasVisibleRef.current = false;
      navigation.navigate('GroupCall', {
        callId,
        channelName,
        token,
        uid,
        callType,
        groupId,
        groupName: groupName || 'Nhóm',
      });
    }
  }, [status, isHost, callId, channelName, token, uid, callType, groupId, groupName, navigation]);

  // Clean up if the call ends while we are waiting
  useEffect(() => {
    if (status === 'ended' && wasVisibleRef.current) {
      wasVisibleRef.current = false;
      dispatch(endGroupCall());
    }
  }, [status, dispatch]);

  const handleCancel = useCallback(async () => {
    try {
      if (sessionId) {
        await callApi.leaveGroupCall(sessionId);
      }
    } catch (e) {
      // Ignore API errors on cancel
    }
    dispatch(endGroupCall());
  }, [sessionId, dispatch]);

  if (!visible) return null;

  const isVideo = callType === 'video';
  const nameToDisplay = groupName || 'Nhóm';

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
            <Text style={styles.callerName}>{nameToDisplay}</Text>
            <Text style={styles.callTypeText}>
              {`Đang gọi nhóm ${isVideo ? 'video' : 'thoại'}...`}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.rejectButton} onPress={handleCancel}>
              <Ionicons name="call" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Huỷ</Text>
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
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default GroupOutgoingCallModal;
