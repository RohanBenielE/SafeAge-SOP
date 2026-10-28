
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const moods = [
  { emoji: '😊', name: 'Very Good' },
  { emoji: '🙂', name: 'Good' },
  { emoji: '😐', name: 'Okay' },
  { emoji: '😔', name: 'Sad' },
  { emoji: '😟', name: 'Worried' },
];

function MoodButton({ title, onPress, light = false }) {
  return (
    <Pressable
      style={light ? styles.lightButton : styles.button}
      onPress={onPress}
    >
      <Text style={light ? styles.lightText : styles.buttonText}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function MoodModal({
  open,
  close,
  selected,
  setSelected,
  save,
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.moodModal}>
          <Text style={styles.heading}>🧠 Daily Mood Check</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>

          {moods.map(mood => (
            <Pressable
              key={mood.name}
              onPress={() => setSelected(mood.name)}
              style={[
                styles.moodOption,
                selected === mood.name && styles.moodOptionSelected,
              ]}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodName}>{mood.name}</Text>
            </Pressable>
          ))}

          <MoodButton
            title="Save Mood"
            onPress={() => save(selected)}
          />
          <MoodButton title="Cancel" onPress={close} light />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  moodModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
  },
  heading: {
    fontSize: 21,
    fontWeight: '700',
    color: '#153B67',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E8F2',
  },
  moodOptionSelected: {
    backgroundColor: '#DCEBFF',
    borderColor: '#105CC5',
  },
  moodEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  moodName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#153B67',
  },
  button: {
    backgroundColor: '#105CC5',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  lightButton: {
    borderWidth: 1,
    borderColor: '#105CC5',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  lightText: {
    color: '#105CC5',
    fontWeight: '700',
  },
});
