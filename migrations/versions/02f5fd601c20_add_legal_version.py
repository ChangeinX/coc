"""add legal version column"""

from alembic import op
import sqlalchemy as sa

revision = '02f5fd601c20'
down_revision = 'f3d74c7759b3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('legal', sa.Column('version', sa.String(length=20), nullable=True))


def downgrade():
    op.drop_column('legal', 'version')
