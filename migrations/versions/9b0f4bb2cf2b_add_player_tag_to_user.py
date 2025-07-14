"""add player_tag column to users

Revision ID: 9b0f4bb2cf2b
Revises: 7c1104746dcc
Create Date: 2025-07-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9b0f4bb2cf2b'
down_revision = '7c1104746dcc'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('player_tag', sa.String(length=15), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_player_tag'), ['player_tag'], unique=False)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_player_tag'))
        batch_op.drop_column('player_tag')
