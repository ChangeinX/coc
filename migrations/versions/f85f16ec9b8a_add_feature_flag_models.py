"""add feature flag models

Revision ID: f85f16ec9b8a
Revises: 8af377ebd2cc
Create Date: 2025-10-01 00:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f85f16ec9b8a'
down_revision = '8af377ebd2cc'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'feature_flags',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_table(
        'user_profile_features',
        sa.Column('profile_id', sa.BigInteger(), nullable=False),
        sa.Column('feature_id', sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(['feature_id'], ['feature_flags.id'], ),
        sa.ForeignKeyConstraint(['profile_id'], ['user_profiles.id'], ),
        sa.PrimaryKeyConstraint('profile_id', 'feature_id')
    )
    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('all_features', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.drop_column('all_features')
    op.drop_table('user_profile_features')
    op.drop_table('feature_flags')
