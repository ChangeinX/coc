"""seed moderation rules

Revision ID: b7028ae0d5e1
Revises: a1e6e2f7b8c3
Create Date: 2025-07-30 00:00:01
"""
from alembic import op
import sqlalchemy as sa
import json

revision = 'b7028ae0d5e1'
down_revision = 'a1e6e2f7b8c3'
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
                'name': 'ban sexual minors',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'sexual_minors', 'threshold': 0.8, 'reason': 'banned'}),
                'active': True,
            },
            {
                'name': 'ban extremism',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'extremism', 'threshold': 0.8, 'reason': 'banned'}),
                'active': True,
            },
            {
                'name': 'mute flagged',
                'definition': json.dumps({'type': 'category_any', 'threshold': 0.8, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'toxicity warning',
                'definition': json.dumps({'type': 'toxicity_warning', 'min': 0.7, 'max': 0.8}),
                'active': True,
            },
            {
                'name': 'duplicate messages',
                'definition': json.dumps({'type': 'duplicate', 'window': 10, 'duration': 600, 'reason': 'readonly'}),
                'active': True,
            },
        ]
    )


def downgrade():
    op.execute('delete from rules')
