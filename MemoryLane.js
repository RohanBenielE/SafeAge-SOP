
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from './firebase';
const FUNCTION_URL =
  'https://vdwargpjnugcyinsgccc.supabase.co/functions/v1/memory-lane';

export default function MemoryLane({ seniorId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const callFunction = async (action, formData = null) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please sign in first.');

    const token = await currentUser.getIdToken();

    const options = {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData || JSON.stringify({ action, seniorId }),
    };

    if (!formData) options.headers['Content-Type'] = 'application/json';

    const response = await fetch(FUNCTION_URL, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Memory Lane request failed.');
    }

    return result;
  };

  const loadPhotos = useCallback(async () => {
    if (!seniorId) return;
    try {
      const result = await callFunction('list');
      setPhotos(result.photos || []);
    } catch (error) {
      Alert.alert('Memory Lane', error.message);
    }
  }, [seniorId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const uploadPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow access to choose a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setLoading(true);

      const form = new FormData();
      form.append('action', 'upload');
      form.append('seniorId', seniorId);
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName || `memory-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });

      await callFunction('upload', form);
      await loadPhotos();
      Alert.alert('Success', 'Memory uploaded!');
    } catch (error) {
      Alert.alert('Upload failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 Memory Lane</Text>
      <Text style={styles.subtitle}>
        Share special moments with family
      </Text>

      <Pressable
        style={styles.button}
        onPress={uploadPhoto}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Uploading...' : '+ Add a memory'}
        </Text>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map(photo => (
          <View key={photo.path} style={styles.photoCard}>
            <Image source={{ uri: photo.url }} style={styles.photo} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#64748B', marginBottom: 14 },
  button: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold' },
  photoCard: { marginRight: 10 },
  photo: { width: 180, height: 180, borderRadius: 12 },
});
