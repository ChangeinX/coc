import os

# Check if running in Lambda environment
IS_LAMBDA = bool(os.environ.get('AWS_LAMBDA_FUNCTION_NAME'))

# Conditional imports for Flask dependencies
if not IS_LAMBDA:
    from flask_apscheduler import APScheduler
    from flask_caching import Cache
    from flask_migrate import Migrate
    from flask_sqlalchemy import SQLAlchemy
    
    db = SQLAlchemy()
    cache = Cache()
    scheduler = APScheduler()
    migrate = Migrate()
else:
    # Lambda environment - standalone SQLAlchemy
    from sqlalchemy.orm import DeclarativeBase, relationship, backref
    from sqlalchemy import (
        MetaData, Column, BigInteger, String, DateTime, Boolean, Integer, 
        Text, JSON, ForeignKey, UniqueConstraint, Index, Table, Float, func
    )
    
    class Base(DeclarativeBase):
        metadata = MetaData()
    
    # Create a mock db object with Model attribute and common SQLAlchemy types
    class LambdaDB:
        Model = Base
        Column = Column
        BigInteger = BigInteger
        String = String
        DateTime = DateTime
        Boolean = Boolean
        Integer = Integer
        Text = Text
        JSON = JSON
        ForeignKey = ForeignKey
        UniqueConstraint = UniqueConstraint
        Index = Index
        Table = Table
        Float = Float
        func = func
        
        # These need to be static methods to avoid 'self' parameter
        @staticmethod
        def backref(name, **kwargs):
            return backref(name, **kwargs)
            
        @staticmethod
        def relationship(*args, **kwargs):
            return relationship(*args, **kwargs)
        
    db = LambdaDB()
    cache = None
    scheduler = None
    migrate = None
