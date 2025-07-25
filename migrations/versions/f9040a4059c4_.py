"""empty message

Revision ID: f9040a4059c4
Revises: 9b0f4bb2cf2b
Create Date: 2025-07-14 18:45:45.338060

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9040a4059c4'
down_revision = '9b0f4bb2cf2b'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_email')
        batch_op.drop_index('ix_users_sub')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index('ix_users_sub', ['sub'], unique=False)
        batch_op.create_index('ix_users_email', ['email'], unique=False)

    # ### end Alembic commands ###
