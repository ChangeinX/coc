"""add deep_link to player and clan

Revision ID: c7b8e59ad0d1
Revises: 7d99b8886d9d
Create Date: 2025-08-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c7b8e59ad0d1'
down_revision = '7d99b8886d9d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('clans') as batch_op:
        batch_op.add_column(sa.Column('deep_link', sa.String(length=255), nullable=True))
    with op.batch_alter_table('players') as batch_op:
        batch_op.add_column(sa.Column('deep_link', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('players') as batch_op:
        batch_op.drop_column('deep_link')
    with op.batch_alter_table('clans') as batch_op:
        batch_op.drop_column('deep_link')
