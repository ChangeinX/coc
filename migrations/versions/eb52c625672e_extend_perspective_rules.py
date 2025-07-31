"""add individual perspective rules

Revision ID: eb52c625672e
Revises: 61545e86c9d9
Create Date: 2025-10-11 00:00:00
"""
from alembic import op
import sqlalchemy as sa
import json

revision = 'eb52c625672e'
down_revision = '61545e86c9d9'
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
                'name': 'mute toxicity (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'toxicity', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute severe toxicity (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'severe_toxicity', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute insult (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'insult', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute threat (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'threat', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute identity attack (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'identity_attack', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute sexually explicit (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'sexually_explicit', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute flirtation (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'flirtation', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
            {
                'name': 'mute spam (perspective)',
                'definition': json.dumps({'type': 'category_threshold', 'category': 'spam', 'threshold': 0.9, 'duration': 86400, 'reason': 'mute'}),
                'active': True,
            },
        ]
    )


def downgrade():
    op.execute("delete from rules where name like 'mute % (perspective)'")

