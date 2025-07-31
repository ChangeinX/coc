"""seed perspective moderation rules

Revision ID: 61545e86c9d9
Revises: d9ddc8754765
Create Date: 2025-10-10 00:00:00
"""
from alembic import op
import sqlalchemy as sa
import json

revision = '61545e86c9d9'
down_revision = 'd9ddc8754765'
branch_labels = None
depends_on = None


def upgrade():
    rules = sa.table(
        'rules',
        sa.column('name', sa.String()),
        sa.column('definition', sa.JSON()),
        sa.column('active', sa.Boolean()),
    )
    op.bulk_insert(
        rules,
        [
            {
                'name': 'ban profanity (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'profanity', 'threshold': 0.9, 'reason': 'banned'}),
                'active': True,
            },
            {
                'name': 'mute perspective flagged',
                'definition': json.dumps({'type': 'category_any', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
        ]
    )


def downgrade():
    op.execute("delete from rules where name like 'ban profanity (perspective)' or name like 'mute perspective flagged'")
