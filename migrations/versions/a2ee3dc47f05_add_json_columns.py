"""add json columns to snapshot and player tables

Revision ID: a2ee3dc47f05
Revises: 6579bd364dee
Create Date: 2025-07-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a2ee3dc47f05"
down_revision = "6579bd364dee"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("clan_snapshots", schema=None) as batch_op:
        batch_op.add_column(sa.Column("data", sa.JSON(), nullable=True))

    with op.batch_alter_table("player_snapshots", schema=None) as batch_op:
        batch_op.add_column(sa.Column("data", sa.JSON(), nullable=True))

    with op.batch_alter_table("players", schema=None) as batch_op:
        batch_op.add_column(sa.Column("data", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("players", schema=None) as batch_op:
        batch_op.drop_column("data")

    with op.batch_alter_table("player_snapshots", schema=None) as batch_op:
        batch_op.drop_column("data")

    with op.batch_alter_table("clan_snapshots", schema=None) as batch_op:
        batch_op.drop_column("data")

