package com.clanboards.messages.repository;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class MessageItem {
    private String PK;
    private String SK;
    private String id;
    private String chatId;
    private String senderId;
    private String content;
    private String ts;
    private Long ttl;

    @DynamoDbPartitionKey
    public String getPK() { return PK; }
    public void setPK(String PK) { this.PK = PK; }

    @DynamoDbSortKey
    public String getSK() { return SK; }
    public void setSK(String SK) { this.SK = SK; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getChatId() { return chatId; }
    public void setChatId(String chatId) { this.chatId = chatId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTs() { return ts; }
    public void setTs(String ts) { this.ts = ts; }

    public Long getTtl() { return ttl; }
    public void setTtl(Long ttl) { this.ttl = ttl; }
}
