package com.clanboards.users.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class FriendshipItem {
    private String PK;
    private String SK;

    @DynamoDbPartitionKey
    public String getPK() { return PK; }
    public void setPK(String PK) { this.PK = PK; }

    @DynamoDbSortKey
    public String getSK() { return SK; }
    public void setSK(String SK) { this.SK = SK; }
}
