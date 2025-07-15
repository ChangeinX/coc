"""add clans table

Revision ID: 000_add_clans_table
Revises: c50b95df90c9
Create Date: 2025-07-20 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '000_add_clans_table'
down_revision = 'c50b95df90c9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'clans',
        sa.Column('tag', sa.String(length=15), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('tag')
    )


def downgrade():
    op.drop_table('clans')
