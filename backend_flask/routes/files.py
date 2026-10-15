from urllib.parse import quote
from flask import Blueprint, Response, jsonify
from models.stored_file import StoredFile

files_bp = Blueprint('files', __name__)


# @route   GET /api/files/:key/:filename
# @desc    Download a stored file (the random key acts as the access token)
# @access  Public
@files_bp.route('/<string:key>/<path:filename>', methods=['GET'])
@files_bp.route('/<string:key>', methods=['GET'])
def get_file(key, filename=None):
    stored = StoredFile.query.filter_by(key=key).first()
    if not stored:
        return jsonify({'success': False, 'message': 'File not found'}), 404

    return Response(
        stored.data,
        mimetype=stored.content_type,
        headers={
            'Content-Disposition': f"inline; filename*=UTF-8''{quote(stored.filename)}",
            'Cache-Control': 'private, max-age=86400'
        }
    )
