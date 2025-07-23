"""add friend request table

Revision ID: 4ed621612137
Revises: f9040a4059c4
Create Date: 2025-07-23 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4ed621612137'
down_revision = 'f9040a4059c4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'friend_requests',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('from_user_id', sa.BigInteger(), nullable=True),
        sa.Column('to_user_id', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('friend_requests', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_friend_requests_from_user_id'), ['from_user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_friend_requests_to_user_id'), ['to_user_id'], unique=False)


def downgrade():
    with op.batch_alter_table('friend_requests', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_friend_requests_to_user_id'))
        batch_op.drop_index(batch_op.f('ix_friend_requests_from_user_id'))
    op.drop_table('friend_requests')
