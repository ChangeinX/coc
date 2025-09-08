"""add legal version column"""

from alembic import op

revision = '02f5fd601c20'
down_revision = 'f3d74c7759b3'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE legal ADD COLUMN IF NOT EXISTS version VARCHAR(20)"
    )


def downgrade():
    op.drop_column('legal', 'version')
