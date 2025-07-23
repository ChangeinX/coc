# Phase 4 In Progress

## Completed
- [x] ChatRepository using DynamoDbEnhancedClient
- [x] PK/SK helpers in repository
- [x] Friendship service with request handling
- [x] BatchWriteItem fan-out for messages
- [x] DomainEvent WebSocket flow
- [x] Additional repository methods (createIfAbsent, TTL)
- [x] CI workflows run Gradle tests and deploy all services
- [x] GraphQL client utilities and offline outbox added
- [x] Chat UI now sends GraphQL mutations and retries from IndexedDB

## Remaining
- [ ] Subscribe service worker to all chat/shard IDs after login
- [ ] Render global and friend chats using aggregated subscriptions
- [ ] Expose friend request actions in UI
