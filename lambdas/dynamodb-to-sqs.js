const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const sqs = new SQSClient({});

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;
    const item = unmarshall(record.dynamodb.NewImage);
    const chatId = item.chatId;
    const senderId = item.senderId;
    const content = item.content;
    if (!chatId || !senderId || !content) continue;
    if (!chatId.startsWith('direct#')) continue;
    const parts = chatId.split('#');
    if (parts.length < 3) continue;
    const recipients = [parts[1], parts[2]].filter((id) => id !== senderId);
    for (const userId of recipients) {
      const body = JSON.stringify({ userId, senderId, payload: content });
      const command = new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: body,
      });
      await sqs.send(command);
    }
  }
  return {};
};

