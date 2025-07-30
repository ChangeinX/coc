package com.clanboards.messages.controller;

import com.clanboards.messages.service.ModerationException;
import graphql.ErrorType;
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;

/** Maps service exceptions to GraphQL errors. */
@ControllerAdvice
public class GraphQLExceptionHandler {
  @GraphQlExceptionHandler(ModerationException.class)
  public GraphQLError handle(ModerationException ex) {
    return GraphqlErrorBuilder.newError()
        .errorType(ErrorType.DataFetchingException)
        .message(ex.getMessage())
        .build();
  }
}
