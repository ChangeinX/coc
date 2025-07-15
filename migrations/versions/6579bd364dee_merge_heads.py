"""merge heads

Revision ID: 6579bd364dee
Revises: 000_add_clans_table, f9040a4059c4
Create Date: 2025-07-14 22:16:41.448765

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6579bd364dee'
down_revision = ('000_add_clans_table', 'f9040a4059c4')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
