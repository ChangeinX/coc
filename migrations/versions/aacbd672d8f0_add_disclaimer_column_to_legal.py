"""add disclaimer column to legal

Revision ID: aacbd672d8f0
Revises: 02f5fd601c20
Create Date: 2025-07-29 12:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = 'aacbd672d8f0'
down_revision = '02f5fd601c20'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('legal', schema=None) as batch_op:
        batch_op.add_column(sa.Column('acknowledged_disclaimer', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('legal', schema=None) as batch_op:
        batch_op.drop_column('acknowledged_disclaimer')
