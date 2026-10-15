import uuid
from datetime import datetime
from urllib.parse import quote
from sqlalchemy.dialects.mysql import LONGBLOB
from extensions import db


class StoredFile(db.Model):
    """Uploaded file kept in the database so every server instance can serve it."""
    __tablename__ = 'stored_files'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(32), unique=True, nullable=False, index=True)
    category = db.Column(db.String(20), nullable=False, index=True)
    filename = db.Column(db.String(150), nullable=False)
    content_type = db.Column(db.String(100), nullable=False, default='application/octet-stream')
    size = db.Column(db.Integer, nullable=False, default=0)
    data = db.Column(db.LargeBinary().with_variant(LONGBLOB, 'mysql'), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        kwargs.setdefault('key', uuid.uuid4().hex)
        super().__init__(**kwargs)

    @property
    def url(self):
        return f'/api/files/{self.key}/{quote(self.filename)}'

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'filename': self.filename,
            'contentType': self.content_type,
            'size': self.size,
            'url': self.url,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<StoredFile {self.filename}>'
