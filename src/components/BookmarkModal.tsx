import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHistoryStore } from '../store/useHistoryStore';
import { Segment } from '../store/useVideoStore';

interface BookmarkModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  segment: Segment;
}

export const BookmarkModal: React.FC<BookmarkModalProps> = ({ 
  visible, 
  onClose, 
  videoId, 
  segment 
}) => {
  const [note, setNote] = useState('');
  const addBookmark = useHistoryStore((state) => state.addBookmark);

  const handleSave = () => {
    addBookmark({
      videoId,
      segment,
      note: note.trim() || 'No notes',
    });
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <MaterialCommunityIcons name="bookmark-plus" size={24} color="#FF0000" />
              <Text style={styles.title}>Save Bookmark</Text>
            </View>

            <Text style={styles.info}>
              Saving Reel: {segment.start}s - {segment.end}s
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Add a note... (e.g. funny moment, key advice)"
              placeholderTextColor="#666"
              value={note}
              onChangeText={setNote}
              multiline
              autoFocus
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save Bookmark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  info: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    color: '#FFF',
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
