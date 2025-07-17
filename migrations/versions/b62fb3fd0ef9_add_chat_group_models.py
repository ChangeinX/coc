"""add chat group models

Revision ID: b62fb3fd0ef9
Revises: f85f16ec9b8a
Create Date: 2025-07-17 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'b62fb3fd0ef9'
down_revision = 'f85f16ec9b8a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'chat_groups',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'chat_group_members',
        sa.Column('group_id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['chat_groups.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('group_id', 'user_id')
    )


def downgrade():
    op.drop_table('chat_group_members')
    op.drop_table('chat_groups')
