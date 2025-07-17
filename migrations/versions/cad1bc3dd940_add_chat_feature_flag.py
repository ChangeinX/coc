"""add chat feature flag

Revision ID: cad1bc3dd940
Revises: b62fb3fd0ef9
Create Date: 2025-10-05 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = 'cad1bc3dd940'
down_revision = 'b62fb3fd0ef9'
branch_labels = None
depends_on = None


def upgrade():
    feature_flags = sa.table('feature_flags', sa.column('name', sa.String()))
    op.bulk_insert(feature_flags, [{'name': 'chat'}])


def downgrade():
    op.execute("delete from feature_flags where name='chat'")
