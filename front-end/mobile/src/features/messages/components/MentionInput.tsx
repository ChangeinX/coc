import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '@theme/index';

interface Member {
  name: string;
  tag: string;
}

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  members?: Member[];
  maxLength?: number;
  multiline?: boolean;
  disabled?: boolean;
  style?: any;
}

interface MentionCandidate {
  member: Member;
  startIndex: number;
  query: string;
}


export default function MentionInput({
  value,
  onChangeText,
  placeholder = 'Type a message...',
  members = [],
  maxLength = 500,
  multiline = true,
  disabled = false,
  style,
}: MentionInputProps) {
  const { colors } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Member[]>([]);
  const [mentionCandidate, setMentionCandidate] = useState<MentionCandidate | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const textInputRef = useRef<TextInput>(null);

  const findMentionCandidate = useCallback((text: string, cursor: number): MentionCandidate | null => {
    if (cursor === 0) return null;
    
    // Look backwards from cursor to find '@' symbol
    for (let i = cursor - 1; i >= 0; i--) {
      const char = text[i];
      
      if (char === '@') {
        const query = text.slice(i + 1, cursor);
        
        // Check if this is a valid mention candidate (no spaces in query)
        if (!query.includes(' ') && query.length <= 20) {
          // Create a fake member for the candidate
          return {
            member: { name: '', tag: '' },
            startIndex: i,
            query,
          };
        }
        break;
      }
      
      // Stop if we hit a space or newline before finding @
      if (char === ' ' || char === '\n') {
        break;
      }
    }
    
    return null;
  }, []);

  const filterMembers = useCallback((query: string): Member[] => {
    if (!query.trim()) return members.slice(0, 5);
    
    const lowerQuery = query.toLowerCase();
    return members
      .filter(member => 
        member.name.toLowerCase().includes(lowerQuery) ||
        member.tag.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);
  }, [members]);

  const handleTextChange = useCallback((text: string) => {
    onChangeText(text);
    
    const candidate = findMentionCandidate(text, cursorPosition);
    
    if (candidate) {
      setMentionCandidate(candidate);
      const filteredSuggestions = filterMembers(candidate.query);
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    } else {
      setMentionCandidate(null);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChangeText, cursorPosition, findMentionCandidate, filterMembers]);

  const handleSelectionChange = useCallback((event: any) => {
    const { selection } = event.nativeEvent;
    setCursorPosition(selection.end);
    
    // Re-check for mention candidate at new cursor position
    const candidate = findMentionCandidate(value, selection.end);
    
    if (candidate) {
      setMentionCandidate(candidate);
      const filteredSuggestions = filterMembers(candidate.query);
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    } else {
      setMentionCandidate(null);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, findMentionCandidate, filterMembers]);

  const insertMention = useCallback((member: Member) => {
    if (!mentionCandidate) return;
    
    const { startIndex } = mentionCandidate;
    const beforeMention = value.slice(0, startIndex);
    const afterMention = value.slice(cursorPosition);
    
    // Format mention as @[name](tag)
    const mention = `@[${member.name}](${member.tag})`;
    const newText = beforeMention + mention + afterMention;
    
    onChangeText(newText);
    
    // Move cursor to after the mention
    const newCursorPosition = startIndex + mention.length;
    setCursorPosition(newCursorPosition);
    
    // Close suggestions
    setShowSuggestions(false);
    setMentionCandidate(null);
    setSuggestions([]);
    
    // Focus back to input and set cursor position
    setTimeout(() => {
      textInputRef.current?.focus();
      textInputRef.current?.setNativeProps({
        selection: { start: newCursorPosition, end: newCursorPosition }
      });
    }, 50);
  }, [mentionCandidate, value, cursorPosition, onChangeText]);

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setMentionCandidate(null);
    setSuggestions([]);
  }, []);

  const renderSuggestion = ({ item }: { item: Member }) => (
    <Pressable
      style={[styles.suggestionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => insertMention(item)}
      android_ripple={{ color: colors.primary + '20' }}
    >
      <View style={styles.suggestionContent}>
        <Text style={[styles.suggestionName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.suggestionTag, { color: colors.textSecondary }]}>
          {item.tag}
        </Text>
      </View>
    </Pressable>
  );

  const inputStyle = [
    styles.textInput,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
    style,
  ];

  return (
    <View style={styles.container}>
      <TextInput
        ref={textInputRef}
        style={inputStyle}
        value={value}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        maxLength={maxLength}
        multiline={multiline}
        editable={!disabled}
        textAlignVertical={multiline ? 'top' : 'center'}
        blurOnSubmit={false}
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={closeSuggestions}
        >
          <Pressable style={styles.modalOverlay} onPress={closeSuggestions}>
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.background }]}>
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item) => item.tag}
                style={styles.suggestionsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    lineHeight: 20,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    ...Platform.select({
      ios: {
        paddingTop: 8,
        paddingBottom: 8,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-end',
  },
  suggestionsContainer: {
    maxHeight: 200,
    marginHorizontal: 16,
    marginBottom: 100,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  suggestionTag: {
    fontSize: 14,
    marginLeft: 8,
  },
});