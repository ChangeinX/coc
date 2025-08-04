"""merge heads

Revision ID: 2bb376b11a5b
Revises: c7b8e59ad0d1, c86c1db6f7a3
Create Date: 2025-08-02 22:09:35.646104

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2bb376b11a5b'
down_revision = ('c7b8e59ad0d1', 'c86c1db6f7a3')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
