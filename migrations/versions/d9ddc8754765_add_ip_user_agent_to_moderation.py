"""add ip and user_agent columns to moderation table

Revision ID: d9ddc8754765
Revises: b7028ae0d5e1
Create Date: 2025-07-31 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd9ddc8754765'
down_revision = 'b7028ae0d5e1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('moderation') as batch_op:
        batch_op.add_column(sa.Column('ip', sa.String(length=45), nullable=True))
        batch_op.add_column(sa.Column('user_agent', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('moderation') as batch_op:
        batch_op.drop_column('user_agent')
        batch_op.drop_column('ip')
