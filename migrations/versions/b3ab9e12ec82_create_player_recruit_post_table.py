"""create player recruit post table

Revision ID: b3ab9e12ec82
Revises: c86c1db6f7a3
Create Date: 2025-08-03 03:39:24.014945

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3ab9e12ec82'
down_revision = 'c86c1db6f7a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "player_recruit_posts",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("league", sa.String(length=50), nullable=True),
        sa.Column("language", sa.String(length=50), nullable=True),
        sa.Column("war", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_player_recruit_posts_user_id", "player_recruit_posts", ["user_id"]
    )


def downgrade():
    op.drop_table("player_recruit_posts")
