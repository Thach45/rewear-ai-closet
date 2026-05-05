import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { AuthStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export function SplashOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { user, isHydrating, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isHydrating) return;
    if (user && !isLoggedIn) {
      const hasSurvey = Boolean(user.gender);
      navigation.reset({
        index: 0,
        routes: [{ name: hasSurvey ? 'AvatarSetup' : 'UserSurvey' }],
      });
    }
  }, [isHydrating, user, isLoggedIn, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoRing}>
          <Feather name="wind" size={48} color={theme.colors.ecoGreen} />
        </View>
        <Text style={styles.brand}>ReWear</Text>
        <Text style={styles.slogan}>Mặc thông minh, sống xanh hơn</Text>
        <Text style={styles.hint}>
          Ứng dụng thời trang bền vững — tủ đồ số, gợi ý AI, tái sinh đồ cũ.
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Bắt đầu ngay" onPress={() => navigation.navigate('Login')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  logoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: theme.colors.neonSoft,
    borderWidth: 3,
    borderColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  brand: {
    fontSize: 42,
    fontWeight: '900',
    color: theme.colors.ecoGreen,
    letterSpacing: -1,
  },
  slogan: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 26,
  },
  hint: {
    marginTop: theme.spacing.lg,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
});
