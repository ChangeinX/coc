"""add disclaimer seen field to users

Revision ID: bf74125f
Revises: cad1bc3dd940
Create Date: 2025-10-06 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'bf74125f'
down_revision = 'cad1bc3dd940'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('seen_supercell_disclaimer', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('seen_supercell_disclaimer')
