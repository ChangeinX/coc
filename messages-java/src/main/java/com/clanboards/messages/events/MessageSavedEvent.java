package com.clanboards.messages.events;

import com.clanboards.messages.model.ChatMessage;

public record MessageSavedEvent(ChatMessage message) {}
