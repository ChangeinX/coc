import { graphqlRequest, GraphQLError, chatOperations } from '../graphqlClient';
import { apiFetch } from '../apiClient';

// Mock dependencies
jest.mock('../apiClient');
jest.mock('@env', () => ({
  API_URL: 'https://test-messages.com'
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('GraphQL client logging enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  it('should log GraphQL request with correlation ID and operation details', async () => {
    // Given
    const mockResponse = {
      data: {
        listChats: [
          { id: 'global#shard-0', kind: 'GLOBAL' },
          { id: 'global#shard-1', kind: 'GLOBAL' }
        ]
      }
    };
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const query = `
      query {
        listChats {
          id
          kind
        }
      }
    `;

    // When
    const result = await graphqlRequest(query);

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL REQUEST \(unknown\):/),
      expect.objectContaining({
        url: 'https://test-messages.com/api/v1/chat/graphql',
        operationName: 'unknown',
        variables: {},
        query: expect.stringContaining('listChats'),
        timestamp: expect.any(String)
      })
    );

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL RESPONSE \(unknown\):/),
      expect.objectContaining({
        hasData: true,
        hasErrors: false,
        errorCount: 0,
        durationMs: expect.any(Number)
      })
    );

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] ✅ GRAPHQL SUCCESS \(unknown\):/),
      expect.objectContaining({
        dataKeys: ['listChats'],
        dataSize: expect.any(Number)
      })
    );

    expect(result).toEqual(mockResponse.data);
  });

  it('should extract operation names correctly', async () => {
    // Given
    const queries = [
      { query: 'query listChats { listChats { id } }', expectedName: 'listChats' },
      { query: 'mutation sendMessage($chatId: ID!) { sendMessage(chatId: $chatId) { id } }', expectedName: 'sendMessage' },
      { query: 'query getMessages($id: ID!) { getMessages(chatId: $id) { content } }', expectedName: 'getMessages' }
    ];

    mockApiFetch.mockResolvedValue({ data: {} });

    // When & Then
    for (const { query, expectedName } of queries) {
      await graphqlRequest(query);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`\\[gql-\\d+-\\d+\\] 📊 GRAPHQL REQUEST \\(${expectedName}\\):`)),
        expect.any(Object)
      );
    }
  });

  it('should log GraphQL errors with detailed information', async () => {
    // Given
    const mockErrorResponse = {
      data: null,
      errors: [
        {
          message: 'Unauthenticated',
          path: ['listChats'],
          extensions: { code: 'UNAUTHENTICATED' }
        },
        {
          message: 'Access denied',
          path: ['listChats'],
          extensions: { code: 'FORBIDDEN' }
        }
      ]
    };
    mockApiFetch.mockResolvedValueOnce(mockErrorResponse);

    const query = 'query { listChats { id } }';

    // When
    try {
      await graphqlRequest(query);
      fail('Expected GraphQLError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError);
    }

    // Then
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] ❌ GRAPHQL ERRORS \(unknown\):/),
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Unauthenticated',
          path: ['listChats']
        }),
        expect.objectContaining({
          message: 'Access denied',
          path: ['listChats']
        })
      ])
    );

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL RESPONSE \(unknown\):/),
      expect.objectContaining({
        hasData: false,
        hasErrors: true,
        errorCount: 2
      })
    );
  });

  it('should log when apiFetch throws an error', async () => {
    // Given
    const apiError = new Error('Network error');
    (apiError as any).status = 500;
    (apiError as any).name = 'ApiError';
    mockApiFetch.mockRejectedValueOnce(apiError);

    const query = 'query { listChats }';

    // When
    try {
      await graphqlRequest(query);
      fail('Expected error to be thrown');
    } catch (error) {
      expect(error).toBe(apiError);
    }

    // Then
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] ❌ GRAPHQL ERROR \(unknown\) after \d+ms:/),
      expect.objectContaining({
        error: apiError,
        isGraphQLError: false,
        isApiError: true,
        statusCode: 500
      })
    );
  });

  it('should log request timing', async () => {
    // Given
    mockApiFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: {} }), 50))
    );

    // When
    await graphqlRequest('query { test }');

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL RESPONSE \(unknown\):/),
      expect.objectContaining({
        durationMs: expect.any(Number)
      })
    );

    const responseLog = mockConsoleLog.mock.calls.find(call => 
      call[0].includes('GRAPHQL RESPONSE')
    );
    expect(responseLog?.[1]?.durationMs).toBeGreaterThanOrEqual(50);
  });

  it('should handle variables in logging', async () => {
    // Given
    mockApiFetch.mockResolvedValueOnce({ data: { sendMessage: { id: '123' } } });

    const query = 'mutation sendMessage($chatId: ID!, $content: String!) { sendMessage(chatId: $chatId, content: $content) { id } }';
    const variables = { chatId: 'global#shard-0', content: 'Hello world' };

    // When
    await graphqlRequest(query, variables);

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL REQUEST \(sendMessage\):/),
      expect.objectContaining({
        variables: {
          chatId: 'global#shard-0',
          content: 'Hello world'
        }
      })
    );
  });

  it('should truncate long queries in logs', async () => {
    // Given
    mockApiFetch.mockResolvedValueOnce({ data: {} });

    const longQuery = 'query { ' + 'a'.repeat(300) + ' }';

    // When
    await graphqlRequest(longQuery);

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL REQUEST \(unknown\):/),
      expect.objectContaining({
        query: expect.stringMatching(/\.\.\.$/), // Should end with ...
      })
    );

    const requestLog = mockConsoleLog.mock.calls.find(call => 
      call[0].includes('GRAPHQL REQUEST')
    );
    expect(requestLog?.[1]?.query?.length).toBeLessThanOrEqual(203); // 200 + '...'
  });
});

describe('chatOperations logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log listChats operation with proper operation name', async () => {
    // Given
    mockApiFetch.mockResolvedValueOnce({
      data: {
        listChats: [
          { id: 'global#shard-0', kind: 'GLOBAL' }
        ]
      }
    });

    // When
    await chatOperations.listChats();

    // Then
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringMatching(/\[gql-\d+-\d+\] 📊 GRAPHQL REQUEST \(unknown\):/),
      expect.objectContaining({
        operationName: 'unknown',
        query: expect.stringContaining('listChats')
      })
    );
  });
});