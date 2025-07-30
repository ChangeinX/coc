"""add moderation tables

Revision ID: a1e6e2f7b8c3
Revises: f9040a4059c4
Create Date: 2025-07-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1e6e2f7b8c3'
down_revision = 'f9040a4059c4'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'moderation',
        sa.Column('id', sa.BigInteger(), primary_key=True),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('categories', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_moderation_user_id', 'moderation', ['user_id'])

    op.create_table(
        'blocked',
        sa.Column('user_id', sa.String(length=255), primary_key=True),
        sa.Column('until', sa.DateTime(), nullable=True),
        sa.Column('permanent', sa.Boolean(), nullable=True),
        sa.Column('reason', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    op.create_table(
        'rules',
        sa.Column('id', sa.BigInteger(), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('definition', sa.JSON(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=True),
    )


def downgrade():
    op.drop_table('rules')
    op.drop_table('blocked')
    op.drop_index('ix_moderation_user_id', table_name='moderation')
    op.drop_table('moderation')
