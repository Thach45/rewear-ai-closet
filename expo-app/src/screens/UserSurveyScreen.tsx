import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AuthStackParamList } from '@/navigation/types';

const OPTIONS = {
  gender: [
    { label: 'Nam', value: 'male', icon: 'male' },
    { label: 'Nữ', value: 'female', icon: 'female' },
    { label: 'Khác', value: 'unisex', icon: 'transgender' },
  ],
  bodyShape: [
    { label: 'Hình chữ nhật', value: 'rectangle' },
    { label: 'Quả lê', value: 'pear' },
    { label: 'Tam giác ngược', value: 'inverted_triangle' },
    { label: 'Quả táo', value: 'apple' },
    { label: 'Đồng hồ cát', value: 'hourglass' },
  ],
  skinTone: [
    { label: 'Trắng sáng', value: 'fair', color: '#FFF5E1' },
    { label: 'Sáng', value: 'light', color: '#FFE0BD' },
    { label: 'Trung bình', value: 'medium', color: '#E5C298' },
    { label: 'Hơi ngăm', value: 'tan', color: '#C68642' },
    { label: 'Tối', value: 'dark', color: '#8D5524' },
  ],
  ageGroup: [
    { label: 'Dưới 18', value: 'under_18' },
    { label: '18 - 24', value: 'age_18_24' },
    { label: '25 - 34', value: 'age_25_34' },
    { label: '35 - 44', value: 'age_35_44' },
    { label: 'Trên 45', value: 'above_45' },
  ],
  style: [
    { label: 'Tối giản', value: 'minimal' },
    { label: 'Đường phố', value: 'street' },
    { label: 'Công sở', value: 'formal' },
    { label: 'Năng động', value: 'energetic' },
    { label: 'Cổ điển', value: 'vintage' },
    { label: 'Thể thao', value: 'sporty' },
    { label: 'Thanh lịch', value: 'smartCasual' },
    { label: 'Thường ngày', value: 'casual' },
  ],
};

export function UserSurveyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { updateProfile } = useAuth();
  
  const [gender, setGender] = useState<string | null>(null);
  const [bodyShape, setBodyShape] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleNext = async () => {
    if (!gender || !bodyShape || !skinTone || !ageGroup || selectedStyles.length === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng hoàn thành tất cả các mục để AI hiểu rõ bạn hơn.');
      return;
    }

    setBusy(true);
    try {
      await updateProfile({
        gender: gender as any,
        bodyShape: bodyShape as any,
        skinTone: skinTone as any,
        ageGroup: ageGroup as any,
        stylePreference: selectedStyles,
      });
      navigation.navigate('AvatarSetup');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cập nhật thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Cá nhân hóa AI</Text>
        <Text style={styles.desc}>Trả lời nhanh vài câu hỏi để Rewear gợi ý đồ chuẩn nhất cho bạn.</Text>

        <Section title="Bạn là?" options={OPTIONS.gender} value={gender} onSelect={setGender} />
        <Section title="Dáng người của bạn" options={OPTIONS.bodyShape} value={bodyShape} onSelect={setBodyShape} />
        <Section title="Tông màu da" options={OPTIONS.skinTone} value={skinTone} onSelect={setSkinTone} isColor />
        <Section title="Độ tuổi" options={OPTIONS.ageGroup} value={ageGroup} onSelect={setAgeGroup} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phong cách yêu thích (chọn nhiều)</Text>
          <View style={styles.chipRow}>
            {OPTIONS.style.map((s) => {
              const selected = selectedStyles.includes(s.value);
              return (
                <Pressable
                  key={s.value}
                  onPress={() => toggleStyle(s.value)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton
          title="Tiếp theo"
          onPress={handleNext}
          loading={busy}
          variant="neon"
          style={styles.nextBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, options, value, onSelect, isColor }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {options.map((opt: any) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[
                styles.chip,
                selected && styles.chipActive,
                isColor && { paddingLeft: 8 },
              ]}
            >
              {isColor && (
                <View style={[styles.colorDot, { backgroundColor: opt.color }]} />
              )}
              {opt.icon && (
                <Ionicons 
                  name={opt.icon as any} 
                  size={16} 
                  color={selected ? theme.colors.ecoGreen : theme.colors.textSecondary} 
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  desc: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  chip: {
    margin: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: theme.colors.neon,
    backgroundColor: theme.colors.neonSoft,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipLabelActive: {
    color: theme.colors.ecoGreen,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  nextBtn: {
    marginTop: theme.spacing.lg,
  },
});
