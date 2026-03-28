import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ThemedText from './ThemedText';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  title?: string;
  description?: string;
}

export default function QRCodeDisplay({
  data,
  size = 250,
  title,
  description,
}: QRCodeDisplayProps) {
  return (
    <View style={styles.container}>
      {title && <ThemedText style={styles.title}>{title}</ThemedText>}

      <View style={styles.qrContainer}>
        <QRCode
          value={data}
          size={size}
          color="#000"
          backgroundColor="#fff"
          logoBackgroundColor="#fff"
        />
      </View>

      {description && <ThemedText style={styles.description}>{description}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
});
