"""add user model

Revision ID: 59e68d6c999c
Revises: 2348f16dd92f
Create Date: 2025-07-11 20:19:30.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '59e68d6c999c'
down_revision = '2348f16dd92f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_id', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('provider_id')
    )


def downgrade():
    op.drop_table('users')
