package com.clanboards.messages.config;

import com.clanboards.messages.service.ModerationException;
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;

/** Resolves ModerationException to GraphQL errors. */
@Component
public class ModerationExceptionResolver extends DataFetcherExceptionResolverAdapter {
  @Override
  protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
    if (ex instanceof ModerationException me) {
      return GraphqlErrorBuilder.newError(env)
          .message(me.getMessage())
          .errorType(ErrorType.BAD_REQUEST)
          .build();
    }
    return null;
  }
}
