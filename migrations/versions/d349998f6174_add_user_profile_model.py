from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd349998f6174'
down_revision = 'f9040a4059c4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_profiles',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('risk_weight_war', sa.Float(), nullable=False, server_default='0.4'),
        sa.Column('risk_weight_idle', sa.Float(), nullable=False, server_default='0.35'),
        sa.Column('risk_weight_don_deficit', sa.Float(), nullable=False, server_default='0.15'),
        sa.Column('risk_weight_don_drop', sa.Float(), nullable=False, server_default='0.1'),
        sa.Column('is_leader', sa.Boolean(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )


def downgrade():
    op.drop_table('user_profiles')
