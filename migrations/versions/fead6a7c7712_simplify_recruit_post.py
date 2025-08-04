"""simplify recruit post

Revision ID: fead6a7c7712
Revises: f901db3f1df2
Create Date: 2025-08-04 00:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = 'fead6a7c7712'
down_revision = 'f901db3f1df2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("recruit_posts") as batch_op:
        batch_op.alter_column("description", new_column_name="call_to_action")
        batch_op.drop_column("name")
        batch_op.drop_column("badge")
        batch_op.drop_column("tags")
        batch_op.drop_column("open_slots")
        batch_op.drop_column("total_slots")
        batch_op.drop_column("league")
        batch_op.drop_column("language")
        batch_op.drop_column("war")


def downgrade():
    with op.batch_alter_table("recruit_posts") as batch_op:
        batch_op.add_column(sa.Column("war", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("language", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("league", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("total_slots", sa.Integer(), nullable=False))
        batch_op.add_column(sa.Column("open_slots", sa.Integer(), nullable=False))
        batch_op.add_column(sa.Column("tags", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("badge", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("name", sa.String(length=50), nullable=False))
        batch_op.alter_column("call_to_action", new_column_name="description")
