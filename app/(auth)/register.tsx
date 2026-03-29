import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { router } from 'expo-router';
import { setUser, setLoading } from '../store/slices/authSlice';
import { setIsChild } from '../store/slices/deviceSlice';
import AuthService from '../services/auth.service';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isParentMode, setIsParentMode] = useState(true);
  const dispatch = useDispatch();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      dispatch(setLoading(true));
      const user = await AuthService.signUp(email, password);
      dispatch(setUser(user));
      dispatch(setIsChild(!isParentMode));
      router.replace(isParentMode ? '/(parent)' : '/(child)/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign up');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Create Profile</Text>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Set up secure access for parent or child mode.</Text>

          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleOption, isParentMode && styles.roleOptionActive]}
              onPress={() => setIsParentMode(true)}
            >
              <Text style={[styles.roleOptionText, isParentMode && styles.roleOptionTextActive]}>
                Parent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, !isParentMode && styles.roleOptionActive]}
              onPress={() => setIsParentMode(false)}
            >
              <Text style={[styles.roleOptionText, !isParentMode && styles.roleOptionTextActive]}>
                Child
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#5C6C87" />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#7E8CA5"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#5C6C87" />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#7E8CA5"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#5C6C87" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#7E8CA5"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostButton} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back-outline" size={18} color="#203D73" style={styles.btnIcon} />
            <Text style={styles.ghostButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081629',
  },
  blobOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(74, 144, 255, 0.35)',
    top: -90,
    right: -70,
  },
  blobTwo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(38, 208, 206, 0.25)',
    bottom: -100,
    left: -80,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#F4F7FD',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  eyebrow: {
    color: '#2F5AA8',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    color: '#16243E',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: '#52617C',
    fontSize: 14,
    lineHeight: 20,
  },
  roleToggle: {
    flexDirection: 'row',
    marginBottom: 18,
    borderRadius: 12,
    backgroundColor: '#E6ECF7',
    padding: 4,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#203D73',
  },
  roleOptionText: {
    color: '#22314D',
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D2DAE8',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#192840',
    fontSize: 15,
    paddingVertical: 12,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#123A82',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#203D73',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: 'row',
  },
  btnIcon: {
    marginRight: 8,
  },
  ghostButtonText: {
    color: '#203D73',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default RegisterScreen;
