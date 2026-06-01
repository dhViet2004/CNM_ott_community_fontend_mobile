import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi, uploadApi, type StoryItem } from '@api/endpoints';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (story: StoryItem) => void;
}

const BACKGROUNDS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#111827'];

const CreateStoryModal: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string>();
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUNDS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textScale, setTextScale] = useState(1);
  const [textRotation, setTextRotation] = useState(0);
  const textPosition = useRef(new Animated.ValueXY()).current;
  const textLayout = useRef({ x: 0, y: 0 });
  const transformStart = useRef({ distance: 0, angle: 0, scale: 1, rotation: 0 });

  const readTransform = (touches: readonly any[]) => {
    if (touches.length < 2) return null;
    const [first, second] = touches;
    const dx = second.pageX - first.pageX;
    const dy = second.pageY - first.pageY;
    return {
      distance: Math.sqrt(dx * dx + dy * dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
    };
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      textPosition.extractOffset();
    },
    onPanResponderMove: Animated.event(
      [null, { dx: textPosition.x, dy: textPosition.y }],
      { useNativeDriver: false },
    ),
    onPanResponderRelease: (_, gesture) => {
      textPosition.flattenOffset();
      textLayout.current = {
        x: textLayout.current.x + gesture.dx,
        y: textLayout.current.y + gesture.dy,
      };
    },
  }), [textPosition]);

  const transformResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponderCapture: (event) => event.nativeEvent.touches.length >= 2,
    onPanResponderGrant: (event) => {
      const metrics = readTransform(event.nativeEvent.touches);
      if (metrics) transformStart.current = { ...metrics, scale: textScale, rotation: textRotation };
    },
    onPanResponderMove: (event) => {
      const metrics = readTransform(event.nativeEvent.touches);
      const start = transformStart.current;
      if (!metrics || !start.distance) return;
      setTextScale(Math.max(0.6, Math.min(2, start.scale * metrics.distance / start.distance)));
      setTextRotation(start.rotation + metrics.angle - start.angle);
    },
  }), [textRotation, textScale]);

  const resetAndClose = () => {
    setText('');
    setImageUri(undefined);
    setBackgroundColor(BACKGROUNDS[0]);
    setTextScale(1);
    setTextRotation(0);
    textLayout.current = { x: 0, y: 0 };
    textPosition.setValue({ x: 0, y: 0 });
    textPosition.setOffset({ x: 0, y: 0 });
    onClose();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Cần quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!text.trim() && !imageUri) return;
    setIsSubmitting(true);
    try {
      let mediaUrl: string | undefined;
      if (imageUri) {
        const upload = await uploadApi.uploadDirect(
          { uri: imageUri, name: `story-${Date.now()}.jpg`, type: 'image/jpeg' },
          'stories',
        );
        mediaUrl = upload.url;
      }
      const story = await storiesApi.create({
        type: mediaUrl ? 'image' : 'text',
        text: text.trim(),
        mediaUrl,
        backgroundColor,
        textX: textLayout.current.x,
        textY: textLayout.current.y,
        textScale,
        textRotation,
      });
      onCreated(story);
      resetAndClose();
    } catch (error: any) {
      Alert.alert('Không thể đăng story', error.message || 'Vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
          {imageUri && <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />}
          <View style={styles.header}>
            <TouchableOpacity onPress={resetAndClose}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
            <Text style={styles.title}>Tạo tin</Text>
            <TouchableOpacity onPress={pickImage}><Ionicons name="image-outline" size={28} color="#FFF" /></TouchableOpacity>
          </View>
          <Animated.View {...transformResponder.panHandlers} style={[styles.textEditor, {
            transform: [
              ...textPosition.getTranslateTransform(),
              { scale: textScale },
              { rotate: `${textRotation}deg` },
            ],
          }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nhập nội dung..."
              placeholderTextColor="rgba(255,255,255,0.75)"
              multiline
              style={styles.input}
            />
            <View style={styles.textTools}>
              <View style={styles.toolButton} {...panResponder.panHandlers}>
                <Ionicons name="move-outline" size={19} color="#FFF" />
              </View>
              <TouchableOpacity style={styles.toolButton} onPress={() => setTextRotation((value) => value - 15)}>
                <Ionicons name="refresh-outline" size={19} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={() => setTextScale((value) => Math.max(0.6, value - 0.1))}>
                <Ionicons name="remove" size={19} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={() => setTextScale((value) => Math.min(2, value + 0.1))}>
                <Ionicons name="add" size={19} color="#FFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
          <View style={styles.footer}>
            <View style={styles.colors}>
              {BACKGROUNDS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setBackgroundColor(color)} style={[styles.color, { backgroundColor: color }, backgroundColor === color && styles.selectedColor]} />
              ))}
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={submit} disabled={isSubmitting || (!text.trim() && !imageUri)}>
              {isSubmitting ? <ActivityIndicator color="#111827" /> : <Text style={styles.shareText}>Chia sẻ</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  header: { position: 'absolute', top: 48, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  textEditor: { alignItems: 'center' },
  input: { minWidth: '80%', paddingHorizontal: 32, color: '#FFF', fontSize: 28, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  textTools: { marginTop: 10, flexDirection: 'row', gap: 8 },
  toolButton: { borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', padding: 8 },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colors: { flexDirection: 'row', gap: 7 },
  color: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  selectedColor: { borderWidth: 3, borderColor: '#FFF' },
  shareButton: { minWidth: 108, alignItems: 'center', borderRadius: 12, backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 13 },
  shareText: { color: '#111827', fontSize: 16, fontWeight: '800' },
});

export default CreateStoryModal;
