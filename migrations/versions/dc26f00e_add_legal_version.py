"""add legal version column

Revision ID: dc26f00e
Revises: f3d74c7759b3
Create Date: 2025-07-29 00:30:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'dc26f00e'
down_revision = 'f3d74c7759b3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('legal', sa.Column('version', sa.String(length=20), nullable=True))
    op.execute("UPDATE legal SET version='20250729'")
    op.alter_column('legal', 'version', nullable=False)


def downgrade():
    op.drop_column('legal', 'version')
