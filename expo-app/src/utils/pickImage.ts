import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, ActionSheetIOS } from 'react-native';

/**
 * Mở menu chọn ảnh từ Camera hoặc Thư viện.
 * Trả về URI file cục bộ hoặc null nếu hủy.
 */
export async function pickImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<string | null> {
  const { allowsEditing = true, aspect = [3, 4], quality = 0.8 } = options ?? {};

  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Hủy', 'Chụp ảnh mới', 'Chọn từ thư viện'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            resolve(await launchCamera(allowsEditing, aspect, quality));
          } else if (buttonIndex === 2) {
            resolve(await launchLibrary(allowsEditing, aspect, quality));
          } else {
            resolve(null);
          }
        }
      );
    } else {
      // Android / Web simple fallback
      Alert.alert('Chọn ảnh', 'Bạn muốn lấy ảnh từ đâu?', [
        { text: 'Hủy', onPress: () => resolve(null), style: 'cancel' },
        { text: 'Chụp ảnh', onPress: async () => resolve(await launchCamera(allowsEditing, aspect, quality)) },
        { text: 'Thư viện', onPress: async () => resolve(await launchLibrary(allowsEditing, aspect, quality)) },
      ]);
    }
  });
}

async function launchCamera(allowsEditing: boolean, aspect: [number, number], quality: number) {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Quyền truy cập', 'Vui lòng cho phép truy cập Camera trong cài đặt.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing,
    aspect,
    quality,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

async function launchLibrary(allowsEditing: boolean, aspect: [number, number], quality: number) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Quyền truy cập', 'Vui lòng cho phép truy cập Thư viện ảnh trong cài đặt.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing,
    aspect,
    quality,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
