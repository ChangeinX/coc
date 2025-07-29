"""add legal table

Revision ID: f3d74c7759b3
Revises: 1e1ea9ede481
Create Date: 2025-07-29 00:30:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f3d74c7759b3'
down_revision = '1e1ea9ede481'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'legal',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('accepted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('legal')

