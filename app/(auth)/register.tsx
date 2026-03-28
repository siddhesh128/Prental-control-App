import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import { router } from 'expo-router';
import { setUser, setLoading } from '../store/slices/authSlice';
import { setIsChild } from '../store/slices/deviceSlice';
import { Input, Button } from 'react-native-elements';
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
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>
        <View style={styles.roleToggle}>
          <TouchableOpacity
            style={[styles.roleOption, isParentMode && styles.roleOptionActive]}
            onPress={() => setIsParentMode(true)}
          >
            <Text style={[styles.roleOptionText, isParentMode && styles.roleOptionTextActive]}>
              Parent Account
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, !isParentMode && styles.roleOptionActive]}
            onPress={() => setIsParentMode(false)}
          >
            <Text style={[styles.roleOptionText, !isParentMode && styles.roleOptionTextActive]}>
              Child Account
            </Text>
          </TouchableOpacity>
        </View>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          leftIcon={<Ionicons name="mail-outline" size={24} color="#666" />}
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Ionicons name="lock-closed-outline" size={24} color="#666" />}
        />
        <Input
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          leftIcon={<Ionicons name="lock-closed-outline" size={24} color="#666" />}
        />
        <Button
          title="Sign Up"
          onPress={handleSignUp}
          containerStyle={styles.buttonContainer}
          buttonStyle={styles.button}
        />
        <Button
          title="Back to Login"
          onPress={handleBackToLogin}
          containerStyle={styles.buttonContainer}
          buttonStyle={styles.backButton}
          titleStyle={styles.backButtonText}
          icon={
            <Ionicons name="arrow-back-outline" size={24} color="#0a7ea4" style={styles.backIcon} />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
  },
  roleToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#eef3f7',
    padding: 4,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#0a7ea4',
  },
  roleOptionText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 13,
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 15,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    padding: 15,
  },
  backIcon: {
    marginRight: 10,
  },
  backButtonText: {
    color: '#0a7ea4',
  },
});

export default RegisterScreen;
