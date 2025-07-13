"""add user model

Revision ID: 7c1104746dcc
Revises: 4211c3ea26a0
Create Date: 2025-07-13 21:02:07.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7c1104746dcc'
down_revision = '4211c3ea26a0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('sub', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sub', name='uq_users_sub'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_sub'), ['sub'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=False)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))
        batch_op.drop_index(batch_op.f('ix_users_sub'))

    op.drop_table('users')
