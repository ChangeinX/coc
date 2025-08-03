"""add recruit tables

Revision ID: c86c1db6f7a3
Revises: f9040a4059c4
Create Date: 2024-06-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c86c1db6f7a3"
down_revision = "f9040a4059c4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "recruit_posts",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("clan_tag", sa.String(length=15), nullable=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("badge", sa.String(length=255), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("open_slots", sa.Integer(), nullable=False),
        sa.Column("total_slots", sa.Integer(), nullable=False),
        sa.Column("league", sa.String(length=50), nullable=True),
        sa.Column("language", sa.String(length=50), nullable=True),
        sa.Column("war", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_recruit_posts_clan_tag", "recruit_posts", ["clan_tag"]
    )
    op.create_table(
        "recruit_joins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.BigInteger(), sa.ForeignKey("recruit_posts.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_recruit_joins_post_id", "recruit_joins", ["post_id"]
    )
    op.create_index(
        "ix_recruit_joins_user_id", "recruit_joins", ["user_id"]
    )


def downgrade():
    op.drop_table("recruit_joins")
    op.drop_table("recruit_posts")
