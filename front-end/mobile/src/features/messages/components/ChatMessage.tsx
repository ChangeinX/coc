import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useTheme } from '@theme/index';
import { ChatMessage as ChatMessageType } from '@services/websocketClient';

interface PlayerInfo {
  name: string;
  tag: string;
  icon?: string;
}

interface ChatMessageProps {
  message: ChatMessageType;
  info?: PlayerInfo;
  isSelf: boolean;
  onRetry?: () => void;
  onLongPress?: () => void;
}

function ChatMessage({
  message,
  info,
  isSelf,
  onRetry,
  onLongPress,
}: ChatMessageProps) {
  const { colors, typography } = useTheme();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  };

  const handlePress = () => {
    if (message.status === 'failed' && onRetry) {
      Alert.alert(
        'Retry Message',
        'Would you like to retry sending this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: onRetry },
        ]
      );
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    } else {
      // Default long press behavior - copy message or show options
      Alert.alert(
        'Message Options',
        message.content,
        [
          { text: 'Copy', onPress: () => {/* TODO: Copy to clipboard */} },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const renderMentions = (content: string) => {
    // Simple mention parsing - look for @[name](tag) format
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <Text key={lastIndex} style={[styles.messageText, { color: colors.text }]}>
            {content.slice(lastIndex, match.index)}
          </Text>
        );
      }

      // Add mention
      parts.push(
        <Text
          key={match.index}
          style={[styles.messageText, styles.mention, { color: colors.primary }]}
        >
          @{match[1]}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <Text key={lastIndex} style={[styles.messageText, { color: colors.text }]}>
          {content.slice(lastIndex)}
        </Text>
      );
    }

    return parts.length > 0 ? parts : (
      <Text style={[styles.messageText, { color: colors.text }]}>
        {content}
      </Text>
    );
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return '⏳';
      case 'failed':
        return '❌';
      case 'sent':
      default:
        return '';
    }
  };

  const messageContainerStyle = [
    styles.messageContainer,
    isSelf ? styles.selfMessage : styles.otherMessage,
    {
      backgroundColor: isSelf ? colors.primary : colors.surface,
      borderColor: colors.border,
    },
    message.status === 'failed' && styles.failedMessage,
  ];

  const nameColor = isSelf ? colors.surface : colors.textSecondary;
  const timeColor = isSelf ? colors.surface : colors.textSecondary;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[styles.container, isSelf && styles.selfContainer]}
    >
      {!isSelf && (
        <View style={styles.avatarContainer}>
          {info?.icon ? (
            <Image source={{ uri: info.icon }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                {(info?.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={messageContainerStyle}>
        {!isSelf && info && (
          <View style={styles.messageHeader}>
            <Text style={[styles.senderName, { color: nameColor }]}>
              {info.name}
            </Text>
            {info.tag && (
              <Text style={[styles.senderTag, { color: nameColor }]}>
                {info.tag}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.messageContent}>
          {renderMentions(message.content)}
        </View>
        
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, { color: timeColor }]}>
            {formatTime(message.ts)}
          </Text>
          {message.status && (
            <Text style={[styles.status, { color: timeColor }]}>
              {getStatusIcon()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  selfContainer: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageContainer: {
    maxWidth: '75%',
    minWidth: 80,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
  },
  selfMessage: {
    marginLeft: 'auto',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    marginRight: 'auto',
    borderBottomLeftRadius: 4,
  },
  failedMessage: {
    opacity: 0.7,
    borderColor: '#ef4444',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  senderTag: {
    fontSize: 10,
    opacity: 0.7,
  },
  messageContent: {
    marginVertical: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mention: {
    fontWeight: '600',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.7,
  },
  status: {
    fontSize: 10,
  },
});

export default memo(ChatMessage);