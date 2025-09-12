import { apiFetch } from './apiClient';
import { MESSAGES_URL } from '@env';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export class GraphQLError extends Error {
  constructor(
    message: string,
    public errors: GraphQLResponse['errors'] = []
  ) {
    super(message);
    this.name = 'GraphQLError';
  }

  get firstErrorMessage(): string {
    return this.errors?.[0]?.message || this.message;
  }

  get isUnauthorized(): boolean {
    return this.errors?.some(error => 
      error.message.includes('unauthorized') || 
      error.message.includes('Unauthorized')
    ) || false;
  }

  get isToxicityWarning(): boolean {
    return this.errors?.some(error => 
      error.message.includes('TOXICITY_WARNING')
    ) || false;
  }

  get isReadOnly(): boolean {
    return this.errors?.some(error => 
      error.message.includes('READONLY')
    ) || false;
  }

  get isMuted(): boolean {
    return this.errors?.some(error => 
      error.message.includes('MUTED')
    ) || false;
  }

  get isBanned(): boolean {
    return this.errors?.some(error => 
      error.message.includes('BANNED')
    ) || false;
  }
}

let graphqlRequestCounter = 0;

function generateGraphQLCorrelationId(): string {
  return `gql-${Date.now()}-${++graphqlRequestCounter}`;
}

export async function graphqlRequest<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const correlationId = generateGraphQLCorrelationId();
  const url = `${MESSAGES_URL}/api/v1/chat/graphql`;
  
  // Extract operation name from query for better logging
  const operationMatch = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
  const operationName = operationMatch ? operationMatch[1] : 'unknown';
  
  console.log(`[${correlationId}] 📊 GRAPHQL REQUEST (${operationName}):`, {
    url,
    operationName,
    variables,
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    timestamp: new Date().toISOString()
  });

  const startTime = Date.now();
  
  try {
    const response = await apiFetch<GraphQLResponse<T>>(url, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const duration = Date.now() - startTime;
    
    console.log(`[${correlationId}] 📊 GRAPHQL RESPONSE (${operationName}):`, {
      hasData: Boolean(response.data),
      hasErrors: Boolean(response.errors && response.errors.length > 0),
      errorCount: response.errors?.length || 0,
      durationMs: duration
    });

    if (response.errors && response.errors.length > 0) {
      console.error(`[${correlationId}] ❌ GRAPHQL ERRORS (${operationName}):`, response.errors);
      const errorMessage = response.errors.map(e => e.message).join('; ');
      throw new GraphQLError(errorMessage, response.errors);
    }

    if (response.data) {
      console.log(`[${correlationId}] ✅ GRAPHQL SUCCESS (${operationName}):`, {
        dataKeys: Object.keys(response.data),
        dataSize: JSON.stringify(response.data).length
      });
    }

    return response.data as T;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${correlationId}] ❌ GRAPHQL ERROR (${operationName}) after ${duration}ms:`, {
      error,
      isGraphQLError: error instanceof GraphQLError,
      isApiError: (error as any)?.name === 'ApiError',
      statusCode: (error as any)?.status
    });
    throw error;
  }
}

// Chat-specific GraphQL operations
export const chatQueries = {
  listChats: () => `
    query {
      listChats {
        id
        kind
      }
    }
  `,

  getMessages: (limit = 20) => `
    query($id: ID!, $after: String, $limit: Int) {
      getMessages(chatId: $id, after: $after, limit: $limit) {
        id
        chatId
        ts
        senderId
        content
      }
    }
  `,

  sendMessage: () => `
    mutation($chatId: ID!, $content: String!) {
      sendMessage(chatId: $chatId, content: $content) {
        id
      }
    }
  `,
};

export const chatOperations = {
  async listChats() {
    return graphqlRequest<{
      listChats: Array<{
        id: string;
        kind: 'GLOBAL' | 'DIRECT' | 'CLAN';
      }>;
    }>(chatQueries.listChats());
  },

  async getMessages(chatId: string, after?: string, limit = 20) {
    return graphqlRequest<{
      getMessages: Array<{
        id: string;
        chatId: string;
        ts: string;
        senderId: string;
        content: string;
      }>;
    }>(chatQueries.getMessages(limit), {
      id: chatId,
      after,
      limit,
    });
  },

  async sendMessage(chatId: string, content: string) {
    return graphqlRequest<{
      sendMessage: {
        id: string;
      };
    }>(chatQueries.sendMessage(), {
      chatId,
      content,
    });
  },
};
