import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/**
 * Mở camera chụp quần áo. Trả về URI file cục bộ hoặc null nếu hủy / lỗi.
 */
export async function captureClothingPhoto(): Promise<string | null> {
  if (Platform.OS === 'web') {
    Alert.alert('Chụp ảnh', 'Tính năng chụp chỉ dùng trên app iOS hoặc Android.');
    return null;
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Chưa có quyền', 'Bật quyền camera trong Cài đặt để chụp quần áo.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.88,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
