import { Redirect } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setLoading } from '../store/slices/authSlice';

export default function Index() {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const isParent = useSelector((state: RootState) => state.device.info?.isParent ?? true);

  useEffect(() => {
    // Initialize auth state
    dispatch(setLoading(true));
    // Add any auth initialization logic here
    dispatch(setLoading(false));
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.logoShell}>
          <Image source={require('../assets/images/splash-icon.png')} style={styles.logo} />
        </View>

        <Text style={styles.title}>Parental Control</Text>
        <Text style={styles.subtitle}>Securing family devices in real time</Text>

        <ActivityIndicator size="small" color="#F8FAFF" style={styles.loader} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return isParent ? <Redirect href="/(parent)" /> : <Redirect href="/(child)/dashboard" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1B36',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(35, 201, 255, 0.24)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(105, 124, 255, 0.2)',
  },
  logoShell: {
    width: 118,
    height: 118,
    borderRadius: 28,
    backgroundColor: '#132A54',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  title: {
    marginTop: 22,
    color: '#F8FAFF',
    fontSize: 30,
    fontFamily: 'SpaceMono',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    color: '#B7C7E6',
    fontSize: 14,
  },
  loader: {
    marginTop: 24,
  },
});
