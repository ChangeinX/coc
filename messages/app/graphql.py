import graphene
from flask import g

from messages.services.publisher import publish_message, verify_group_member, fetch_recent_messages

class MessageType(graphene.ObjectType):
    channel = graphene.String()
    userId = graphene.Int()
    content = graphene.String()
    ts = graphene.String()

class Query(graphene.ObjectType):
    history = graphene.List(
        MessageType,
        channel=graphene.String(required=True),
        limit=graphene.Int(required=False),
    )

    def resolve_history(root, info, channel, limit=100):
        if not verify_group_member(g.user.id, channel):
            raise Exception("Forbidden")
        msgs = fetch_recent_messages(channel, limit)
        return [
            MessageType(
                channel=m.channel,
                userId=m.user_id,
                content=m.content,
                ts=m.ts.isoformat(),
            )
            for m in msgs
        ]

class SendMessage(graphene.Mutation):
    class Arguments:
        channel = graphene.String(required=True)
        content = graphene.String(required=True)

    Output = MessageType

    def mutate(root, info, channel, content):
        if not verify_group_member(g.user.id, channel):
            raise Exception("Forbidden")
        msg = publish_message(channel, content, g.user.id)
        return MessageType(
            channel=msg.channel,
            userId=msg.user_id,
            content=msg.content,
            ts=msg.ts.isoformat(),
        )

class Mutation(graphene.ObjectType):
    send_message = SendMessage.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
