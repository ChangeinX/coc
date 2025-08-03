"""add invites table

Revision ID: 2473f333fc90
Revises: f901db3f1df2
Create Date: 2025-08-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2473f333fc90'
down_revision = 'f901db3f1df2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'invites',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('from_user_id', sa.BigInteger(), nullable=False),
        sa.Column('to_user_id', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    with op.batch_alter_table('invites', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_invites_from_user_id'), ['from_user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_invites_to_user_id'), ['to_user_id'], unique=False)


def downgrade():
    with op.batch_alter_table('invites', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_invites_to_user_id'))
        batch_op.drop_index(batch_op.f('ix_invites_from_user_id'))
    op.drop_table('invites')
