"""add scouting table

Revision ID: f901db3f1df2
Revises: ecede0180c1d
Create Date: 2025-07-30 00:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f901db3f1df2'
down_revision = 'ecede0180c1d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'scouting',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('description', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('scouting')
